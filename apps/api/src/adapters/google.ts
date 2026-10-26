import type { Env, ApiContext } from "../config/env";
import { localDate } from "@news4you/core";
import { composeConnectionService } from "@news4you/core/newspaper/services";
import { createDatabaseClient } from "@news4you/database/client";
import {
  googleSettingsSchema as settingsSchema,
  type SourceItem,
  type Preferences,
} from "@news4you/shared";
import { Hono } from "hono";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { z } from "zod";

export function googleConfigured(env: Env) {
  return !!(
    env.AUTH0_GOOGLE_CLIENT_ID &&
    env.AUTH0_GOOGLE_CLIENT_SECRET &&
    env.GOOGLE_TOKEN_ENCRYPTION_KEY &&
    env.AUTH0_GOOGLE_CONNECTION &&
    env.GOOGLE_CALLBACK_URL
  );
}

export class GoogleError extends Error {
  constructor(
    message: string,
    readonly providerCode?: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

const encoder = new TextEncoder();

async function access(env: Env, reader: string) {
  const row = await connection(env, reader);
  if (!row) throw new GoogleError("Connect Google in Settings first");
  return {
    row,
    token: await upstreamToken(env, await unseal(env, reader, row.refreshToken)),
  };
}

function b64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function bytes(value: string) {
  return Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
}

async function connection(env: Env, reader: string) {
  return composeConnectionService(createDatabaseClient(env.DB)).get(reader);
}

async function googleJson(token: string, url: string) {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok)
    throw new GoogleError("Google could not be read. Check consent and reconnect in Settings.");
  if (!r.body) throw new GoogleError("Google returned no content");
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let size = 0,
    text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) {
        await reader.cancel();
        throw new GoogleError("Google returned too much content");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(text);
}

async function key(env: Env) {
  const raw = bytes(env.GOOGLE_TOKEN_ENCRYPTION_KEY!);
  if (raw.length !== 32) throw new GoogleError("Google connection setup is incomplete");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function seal(env: Env, reader: string, value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(reader) },
    await key(env),
    encoder.encode(value),
  );
  return `${b64(iv)}.${b64(new Uint8Array(encrypted))}`;
}

async function tokenRequest(env: Env, body: Record<string, string>) {
  const r = await fetch(`https://${env.AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.AUTH0_GOOGLE_CLIENT_ID,
      client_secret: env.AUTH0_GOOGLE_CLIENT_SECRET,
      ...body,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) {
    const failure = (await r.json().catch(() => null)) as {
      error?: unknown;
    } | null;
    const code =
      typeof failure?.error === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(failure.error)
        ? failure.error
        : "provider_error";
    throw new GoogleError(
      "Google authorization needs attention. Reconnect in Settings.",
      code,
      r.status,
    );
  }
  return z
    .object({
      access_token: z.string(),
      refresh_token: z.string().optional(),
      id_token: z.string().optional(),
      scope: z.string().optional(),
    })
    .passthrough()
    .parse(await r.json());
}

export async function unseal(env: Env, reader: string, value: string) {
  const [iv, data] = value.split(".");
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: bytes(iv),
        additionalData: encoder.encode(reader),
      },
      await key(env),
      bytes(data),
    ),
  );
}

async function upstreamToken(env: Env, refresh: string) {
  const t = await tokenRequest(env, {
    grant_type:
      "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token",
    subject_token: refresh,
    subject_token_type: "urn:ietf:params:oauth:token-type:refresh_token",
    requested_token_type: "http://auth0.com/oauth/token-type/federated-connection-access-token",
    connection: env.AUTH0_GOOGLE_CONNECTION!,
  });
  return t.access_token;
}

const labelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
});

// Read the edition-day calendar and the explicitly configured Gmail scope.
export async function collectGoogle(
  env: Env,
  reader: string,
  p: Preferences,
  date: string,
): Promise<SourceItem[]> {
  const now = new Date();
  const row = await connection(env, reader);
  if (!row) return [];
  const settings = settingsSchema.parse(JSON.parse(row.settings));
  if (!settings.calendar && settings.emailMode === "none") return [];
  const token = await upstreamToken(env, await unseal(env, reader, row.refreshToken));
  const items: SourceItem[] = [];
  if (settings.calendar) {
    // A 72-hour UTC window covers the local day even across DST transitions.
    const pivot = new Date(`${date}T12:00:00Z`).getTime();
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.search = new URLSearchParams({
      timeMin: new Date(pivot - 36 * 3600000).toISOString(),
      timeMax: new Date(pivot + 36 * 3600000).toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "100",
      timeZone: p.timezone,
      fields: "items(id,summary,status,htmlLink,start,end,location),nextPageToken",
    }).toString();
    const data = await googleJson(token, url.href);
    if (data.nextPageToken) throw new GoogleError("Calendar has too many events for one edition");
    for (const e of data.items ?? []) {
      if (e.status === "cancelled" || !e.id) continue;
      const start = e.start?.date ?? e.start?.dateTime;
      const end = e.end?.date ?? e.end?.dateTime;
      if (!start || !end) continue;
      const startDay = e.start.date ?? localDate(new Date(start), p.timezone);
      const endDay = e.end.date
        ? new Date(new Date(e.end.date + "T00:00:00Z").getTime() - 86400000)
            .toISOString()
            .slice(0, 10)
        : localDate(new Date(new Date(end).getTime() - 1), p.timezone);
      if (startDay > date || endDay < date) continue;
      const title = String(e.summary ?? "Calendar event").slice(0, 300);
      const when = e.start.date
        ? "All day"
        : new Intl.DateTimeFormat("en-ZA", {
            timeZone: p.timezone,
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(start));
      items.push({
        id: `calendar-${e.id}`.slice(0, 160),
        title,
        url: safeUrl(e.htmlLink, "https://calendar.google.com/"),
        publishedAt: now.toISOString(),
        fingerprint: `calendar-${e.id}-${date}`,
        kind: "calendar",
        content: `${title}. ${when} (${p.timezone}), starts ${start}, ends ${end}.${e.location ? ` Location: ${String(e.location).slice(0, 300)}.` : ""}`,
      });
    }
  }
  if (settings.emailMode !== "none") {
    // All-mail searches require an explicit setting; legacy selections stay
    // label-scoped. Re-check exclusions and label membership after fetching.
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    url.search = new URLSearchParams({
      ...(settings.emailMode === "label" ? { labelIds: settings.labelId! } : {}),
      // Broaden the second-granularity search slightly, then enforce the
      // exact rolling window against internalDate below.
      q: `after:${Math.floor((now.getTime() - 86400000) / 1000) - 1} before:${Math.ceil(now.getTime() / 1000) + 1} -in:trash -in:spam`,
      maxResults: "8",
    }).toString();
    const data = await googleJson(token, url.href);
    for (const ref of (data.messages ?? []).slice(0, 8)) {
      if (!/^[a-zA-Z0-9_-]+$/.test(ref.id)) continue;
      const m = await googleJson(
        token,
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${ref.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&fields=id,threadId,labelIds,internalDate,payload(headers)`,
      );
      if (m.labelIds?.some((id: string) => id === "TRASH" || id === "SPAM")) continue;
      if (settings.emailMode === "label" && !m.labelIds?.includes(settings.labelId)) continue;
      const subject =
        m.payload?.headers?.find((h: { name: string }) => h.name.toLowerCase() === "subject")
          ?.value ?? "Selected email";
      const from =
        m.payload?.headers?.find((h: { name: string }) => h.name.toLowerCase() === "from")?.value ??
        "";
      const published = new Date(Number(m.internalDate));
      if (!Number.isFinite(published.getTime())) continue;
      if (published.getTime() < now.getTime() - 86400000 || published.getTime() > now.getTime())
        continue;
      items.push({
        id: `email-${m.id}`,
        title: String(subject).slice(0, 300),
        url: `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(m.threadId ?? m.id)}`,
        publishedAt: published.toISOString(),
        fingerprint: `email-${m.id}`,
        kind: "email",
        content: `From: ${String(from).slice(0, 300)}. Received: ${published.toISOString()}.`,
      });
    }
  }
  await composeConnectionService(createDatabaseClient(env.DB)).recordSync(
    reader,
    now.toISOString(),
  );
  return items;
}

export function googleCallback(keyOverride?: JWTVerifyGetKey) {
  return async (c: import("hono").Context<ApiContext>) => {
    c.header("Cache-Control", "no-store");
    c.header("Referrer-Policy", "no-referrer");
    const done = (status: string, stage?: string) =>
      c.redirect(
        `${c.env.DASHBOARD_ORIGIN}/settings?google=${status}${stage ? `&stage=${stage}` : ""}`,
      );
    const state = c.req.query("state");
    if (!state || !googleConfigured(c.env)) return done("failed");
    const row = await c.get("services").connection.consumeAuthorization(state);
    if (!row || row.expiresAt < new Date().toISOString() || !c.req.query("code"))
      return done("failed");
    let stage = "code-exchange";
    try {
      const t = await tokenRequest(c.env, {
        grant_type: "authorization_code",
        code: c.req.query("code")!,
        redirect_uri: c.env.GOOGLE_CALLBACK_URL!,
        code_verifier: await unseal(c.env, row.readerId, row.verifier),
      });
      if (!t.id_token || !t.refresh_token) return done("failed", "offline-access");
      stage = "identity-check";
      const issuer = `https://${c.env.AUTH0_DOMAIN}/`;
      const { payload } = await jwtVerify(
        t.id_token,
        keyOverride ?? createRemoteJWKSet(new URL(".well-known/jwks.json", issuer)),
        {
          issuer,
          audience: c.env.AUTH0_GOOGLE_CLIENT_ID,
          algorithms: ["RS256"],
          requiredClaims: ["sub", "exp", "iat", "nonce"],
        },
      );
      if (payload.sub !== row.readerId || payload.nonce !== row.nonce)
        return done("account-mismatch");
      stage = "token-vault";
      await upstreamToken(c.env, t.refresh_token);
      stage = "save-connection";
      await c
        .get("services")
        .connection.save(row.readerId, await seal(c.env, row.readerId, t.refresh_token));
      return done("ready");
    } catch (error) {
      // Only fixed stages, HTTP status and a restricted provider error code.
      // Never log token responses, identifiers, authorization codes or content.
      console.error("Google daily access failed", {
        stage,
        code: error instanceof GoogleError ? error.providerCode : "validation_error",
        status: error instanceof GoogleError ? error.status : undefined,
      });
      return done("failed", stage);
    }
  };
}

export function googleRoutes() {
  const app = new Hono<ApiContext>();
  app.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    await next();
  });
  app.get("/", async (c) => {
    const row = await connection(c.env, c.get("reader"));
    return c.json({
      configured: googleConfigured(c.env),
      connected: !!row,
      settings: settingsSchema.parse(row ? JSON.parse(row.settings) : {}),
      lastSyncedAt: row?.lastSyncedAt ?? null,
    });
  });
  app.post("/authorize", async (c) => {
    if (!googleConfigured(c.env))
      return c.json({ error: "Google connection setup is pending" }, 503);
    const state = b64(crypto.getRandomValues(new Uint8Array(32)));
    const verifier = b64(crypto.getRandomValues(new Uint8Array(32)));
    const nonce = b64(crypto.getRandomValues(new Uint8Array(32)));
    await c
      .get("services")
      .connection.saveAuthorization(
        state,
        c.get("reader"),
        await seal(c.env, c.get("reader"), verifier),
        nonce,
        new Date(Date.now() + 600000).toISOString(),
      );
    const url = new URL(`https://${c.env.AUTH0_DOMAIN}/authorize`);
    url.search = new URLSearchParams({
      client_id: c.env.AUTH0_GOOGLE_CLIENT_ID!,
      response_type: "code",
      redirect_uri: c.env.GOOGLE_CALLBACK_URL!,
      scope: "openid profile offline_access",
      audience: c.env.AUTH0_AUDIENCE,
      state,
      nonce,
      code_challenge: b64(
        new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(verifier))),
      ),
      code_challenge_method: "S256",
    }).toString();
    return c.json({ url: url.href });
  });
  app.get("/labels", async (c) => {
    const { token } = await access(c.env, c.get("reader"));
    return c.json(await labels(token));
  });
  app.put("/settings", async (c) => {
    const settings = settingsSchema.parse(await c.req.json());
    const { token } = await access(c.env, c.get("reader"));
    if (settings.labelId && !(await labels(token)).some((l) => l.id === settings.labelId))
      return c.json({ error: "Choose one of your Gmail labels" }, 400);
    await c.get("services").connection.saveSettings(c.get("reader"), settings);
    return c.json(settings);
  });
  app.post("/disconnect", async (c) => {
    const reader = c.get("reader");
    const row = await connection(c.env, reader);
    await c.get("services").connection.disconnect(reader);
    if (row) {
      try {
        await fetch(`https://${c.env.AUTH0_DOMAIN}/oauth/revoke`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: c.env.AUTH0_GOOGLE_CLIENT_ID,
            client_secret: c.env.AUTH0_GOOGLE_CLIENT_SECRET,
            token: await unseal(c.env, reader, row.refreshToken),
          }),
          signal: AbortSignal.timeout(10000),
        });
      } catch {
        /* Local removal already prevents future collection. */
      }
    }
    return c.json({ ok: true });
  });
  return app;
}

async function labels(token: string) {
  const data = z
    .object({ labels: z.array(labelSchema).default([]) })
    .parse(await googleJson(token, "https://gmail.googleapis.com/gmail/v1/users/me/labels"));
  return data.labels
    .filter((l) => l.type === "user" && /^Label_[a-zA-Z0-9_-]+$/.test(l.id))
    .map(({ id, name }) => ({ id, name }));
}

export function plainBody(part: any, depth = 0): string {
  if (!part || depth > 8 || part.filename) return "";
  if (part.mimeType === "text/plain" && part.body?.data) {
    try {
      return new TextDecoder().decode(bytes(part.body.data)).slice(0, 5000);
    } catch {
      return "";
    }
  }
  return (part.parts ?? [])
    .slice(0, 20)
    .map((p: unknown) => plainBody(p, depth + 1))
    .filter(Boolean)
    .join("\n")
    .slice(0, 5000);
}

function safeUrl(value: unknown, fallback: string) {
  try {
    const u = new URL(String(value));
    return u.protocol === "https:" && ["www.google.com", "calendar.google.com"].includes(u.hostname)
      ? u.href
      : fallback;
  } catch {
    return fallback;
  }
}

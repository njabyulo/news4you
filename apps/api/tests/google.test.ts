import { collectGoogle, seal, unseal, plainBody } from "../src/adapters/google";
import { createApp } from "../src/app";
import type { Env } from "../src/config/env";
import { defaults, googleSettingsSchema } from "@news4you/shared";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, afterEach, describe, it, expect, vi } from "vitest";

let mf: Miniflare, env: Env, app: ReturnType<typeof createApp>, alice: string, bob: string;

let privateKey: CryptoKey;

async function jwt(sub: string, aud = "api-test", nonce?: string) {
  return new SignJWT(nonce ? { nonce } : {})
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .setIssuer("https://test.auth0.com/")
    .setAudience(aud)
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
}

async function req(path: string, method = "GET", body?: unknown, token = alice) {
  return app.request(
    path,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
    env,
  );
}

beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("ok")}}',
    compatibilityDate: "2026-07-30",
    d1Databases: ["DB"],
  });
  const db = await mf.getD1Database("DB");
  const dir = new URL("../../../packages/database/migrations/", import.meta.url);
  for (const name of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort())
    for (const sql of readFileSync(new URL(name, dir), "utf8")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.prepare(sql).run();
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  const jwk = await exportJWK(pair.publicKey);
  jwk.kid = "test";
  app = createApp(createLocalJWKSet({ keys: [jwk] }));
  env = {
    DB: db as unknown as D1Database,
    AUTH0_DOMAIN: "test.auth0.com",
    AUTH0_AUDIENCE: "api-test",
    DASHBOARD_ORIGIN: "https://paper.example",
    PUBLISHER_TOKEN: "internal-secret",
    AUTH0_GOOGLE_CLIENT_ID: "offline-client",
    AUTH0_GOOGLE_CLIENT_SECRET: "fixture-secret",
    AUTH0_GOOGLE_CONNECTION: "google-oauth2",
    GOOGLE_CALLBACK_URL: "https://api.example/oauth/google/callback",
    GOOGLE_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64url"),
  };
  alice = await jwt("alice");
  bob = await jwt("bob");
  await req("/v1/google");
  await req("/v1/google", "GET", undefined, bob);
});

afterAll(async () => mf.dispose());

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function storeConnection(
  settings: {
    calendar: boolean;
    labelId: string | null;
    emailMode?: "none" | "label" | "all";
  } = { calendar: true, labelId: "Label_paper" },
) {
  await env.DB.prepare(
    "INSERT OR REPLACE INTO google_connections(reader_id,refresh_token,settings,connected_at) VALUES(?,?,?,?)",
  )
    .bind(
      "alice",
      await seal(env, "alice", "fixture-refresh"),
      JSON.stringify(settings),
      new Date().toISOString(),
    )
    .run();
}

describe("Google connection security", () => {
  it("preserves legacy label-only settings and requires an explicit all-mail choice", () => {
    expect(googleSettingsSchema.parse({})).toEqual({
      calendar: true,
      emailMode: "none",
      labelId: null,
    });
    expect(googleSettingsSchema.parse({ labelId: "Label_paper" })).toEqual({
      calendar: true,
      emailMode: "label",
      labelId: "Label_paper",
    });
    expect(
      googleSettingsSchema.parse({ emailMode: "all", labelId: "Label_paper" }).labelId,
    ).toBeNull();
    expect(
      googleSettingsSchema.parse({ emailMode: "none", labelId: "Label_paper" }).labelId,
    ).toBeNull();
    expect(googleSettingsSchema.safeParse({ emailMode: "label" }).success).toBe(false);
  });
  it("encrypts refresh tokens with reader-bound authenticated encryption", async () => {
    const encrypted = await seal(env, "alice", "fixture-refresh");
    expect(encrypted).not.toContain("fixture-refresh");
    expect(await unseal(env, "alice", encrypted)).toBe("fixture-refresh");
    await expect(unseal(env, "bob", encrypted)).rejects.toThrow();
  });
  it("requires authentication and exposes configuration without tokens", async () => {
    expect((await app.request("/v1/google", {}, env)).status).toBe(401);
    await storeConnection();
    const result = await (await req("/v1/google")).json();
    expect(result).toMatchObject({ configured: true, connected: true });
    expect(JSON.stringify(result)).not.toContain("refresh");
    expect(await (await req("/v1/google", "GET", undefined, bob)).json()).toMatchObject({
      connected: false,
    });
  });
  it("uses single-use state, PKCE and verified same-account ID tokens", async () => {
    const start = (await (await req("/v1/google/authorize", "POST")).json()) as { url: string };
    const url = new URL(start.url),
      state = url.searchParams.get("state")!;
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    const row = await env.DB.prepare("SELECT * FROM google_oauth_states WHERE state=?")
      .bind(state)
      .first<any>();
    const id = await jwt("alice", "offline-client", row.nonce);
    const mocked = vi.fn(async (_u: unknown, init?: RequestInit) => {
      const b = JSON.parse(init?.body as string);
      if (b.grant_type === "authorization_code") {
        expect(b.code_verifier).toBe(await unseal(env, "alice", row.verifier));
        return Response.json({
          access_token: "auth0-access",
          refresh_token: "new-refresh",
          id_token: id,
        });
      }
      return Response.json({ access_token: "google-access" });
    });
    vi.stubGlobal("fetch", mocked);
    const callback = await app.request(`/oauth/google/callback?state=${state}&code=code`, {}, env);
    expect(callback.headers.get("Location")).toBe("https://paper.example/settings?google=ready");
    const saved = await env.DB.prepare(
      "SELECT refresh_token FROM google_connections WHERE reader_id='alice'",
    ).first<{ refresh_token: string }>();
    expect(await unseal(env, "alice", saved!.refresh_token)).toBe("new-refresh");
    expect(
      (await app.request(`/oauth/google/callback?state=${state}&code=code`, {}, env)).headers.get(
        "Location",
      ),
    ).toContain("failed");
    expect(mocked).toHaveBeenCalledTimes(2);
  });
  it("rejects another identity and expired states before enabling access", async () => {
    const start = (await (await req("/v1/google/authorize", "POST")).json()) as { url: string };
    const state = new URL(start.url).searchParams.get("state")!;
    const row = await env.DB.prepare("SELECT nonce FROM google_oauth_states WHERE state=?")
      .bind(state)
      .first<{ nonce: string }>();
    const id = await jwt("bob", "offline-client", row!.nonce);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ access_token: "a", refresh_token: "b", id_token: id })),
    );
    const r = await app.request(`/oauth/google/callback?state=${state}&code=code`, {}, env);
    expect(r.headers.get("Location")).toContain("account-mismatch");
    const start2 = (await (await req("/v1/google/authorize", "POST")).json()) as { url: string };
    const s = new URL(start2.url).searchParams.get("state")!;
    await env.DB.prepare("UPDATE google_oauth_states SET expires_at='2000-01-01' WHERE state=?")
      .bind(s)
      .run();
    expect(
      (await app.request(`/oauth/google/callback?state=${s}&code=code`, {}, env)).headers.get(
        "Location",
      ),
    ).toContain("failed");
  });
  it("reports the failed authorization stage without logging provider response data", async () => {
    const start = (await (await req("/v1/google/authorize", "POST")).json()) as { url: string };
    const state = new URL(start.url).searchParams.get("state")!;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: "invalid_grant",
            error_description: "sensitive provider diagnostic",
            access_token: "must-never-be-logged",
          },
          { status: 400 },
        ),
      ),
    );
    const result = await app.request(
      `/oauth/google/callback?state=${state}&code=private-code`,
      {},
      env,
    );
    expect(result.headers.get("Location")).toBe(
      "https://paper.example/settings?google=failed&stage=code-exchange",
    );
    expect(log).toHaveBeenCalledWith("Google daily access failed", {
      stage: "code-exchange",
      code: "invalid_grant",
      status: 400,
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive provider diagnostic");
    expect(JSON.stringify(log.mock.calls)).not.toContain("must-never-be-logged");
    expect(JSON.stringify(log.mock.calls)).not.toContain("private-code");
    expect(
      await env.DB.prepare("SELECT state FROM google_oauth_states WHERE state=?")
        .bind(state)
        .first(),
    ).toBeNull();
  });
  it("validates that the selected label belongs to the account", async () => {
    await storeConnection();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: unknown) =>
        String(u).includes("oauth/token")
          ? Response.json({ access_token: "google-access" })
          : Response.json({
              labels: [
                { id: "Label_paper", name: "News4You", type: "user" },
                { id: "INBOX", name: "Inbox", type: "system" },
              ],
            }),
      ),
    );
    expect(
      (
        await req("/v1/google/settings", "PUT", {
          calendar: true,
          labelId: "INBOX",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await req("/v1/google/settings", "PUT", {
          calendar: true,
          labelId: "Label_notmine",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await req("/v1/google/settings", "PUT", {
          calendar: true,
          labelId: "Label_paper",
        })
      ).status,
    ).toBe(200);
  });
});

describe("personal source collection", () => {
  it("filters email by the chosen label and rechecks membership; keeps local-day events only", async () => {
    await storeConnection();
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: unknown) => {
        const url = String(u);
        calls.push(url);
        if (url.includes("oauth/token")) return Response.json({ access_token: "google-access" });
        if (url.includes("calendar/v3"))
          return Response.json({
            items: [
              {
                id: "today",
                summary: "Design review",
                start: { dateTime: "2026-10-23T23:00:00Z" },
                end: { dateTime: "2026-10-24T00:00:00Z" },
              },
              {
                id: "tomorrow",
                summary: "Tomorrow",
                start: { dateTime: "2026-10-24T23:00:00Z" },
                end: { dateTime: "2026-10-25T00:00:00Z" },
              },
              {
                id: "ended",
                summary: "Already ended",
                start: { date: "2026-10-23" },
                end: { date: "2026-10-24" },
              },
              {
                id: "all",
                summary: "All day",
                start: { date: "2026-10-24" },
                end: { date: "2026-10-25" },
              },
            ],
          });
        if (url.includes("/messages?")) {
          expect(new URL(url).searchParams.get("labelIds")).toBe("Label_paper");
          return Response.json({
            messages: [{ id: "good" }, { id: "removed" }],
          });
        }
        return Response.json({
          id: "good",
          threadId: "thread",
          labelIds: url.includes("/removed?") ? [] : ["Label_paper"],
          internalDate: String(Date.now() - 1000),
          payload: {
            mimeType: "text/plain",
            body: {
              data: Buffer.from("Package expected tomorrow. Do not invent arrival today.").toString(
                "base64url",
              ),
            },
            headers: [{ name: "Subject", value: "Delivery update" }],
          },
        });
      }),
    );
    const items = await collectGoogle(env, "alice", defaults, "2026-10-24");
    expect(items.map((i) => i.title)).toEqual(["Design review", "All day", "Delivery update"]);
    expect(items[0].content).toContain("01:00");
    expect(items[2].content).toContain("Received:");
    expect(items[2].content).not.toContain("expected tomorrow");
    expect(calls.some((u) => u.includes("format=metadata"))).toBe(true);
    expect(calls.some((u) => u.includes("format=full"))).toBe(false);
    expect(calls.filter((u) => u.includes("messages?"))).toHaveLength(1);
    expect(items.every((i) => !i.content.includes("DEMO DATA"))).toBe(true);
  });
  it("never searches Gmail when no label is selected", async () => {
    await storeConnection({ calendar: false, labelId: null });
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await collectGoogle(env, "alice", defaults, "2026-10-24")).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });
  it("reads bounded recent all-mail only after an explicit setting and rechecks exclusions", async () => {
    await storeConnection({ calendar: false, labelId: null, emailMode: "all" });
    const reads: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = new URL(String(input));
        if (url.pathname === "/oauth/token")
          return Response.json({ access_token: "google-access" });
        if (url.pathname.endsWith("/messages")) {
          expect(url.searchParams.has("labelIds")).toBe(false);
          expect(url.searchParams.get("q")).toMatch(/^after:\d+ before:\d+ -in:trash -in:spam$/);
          expect(url.searchParams.get("maxResults")).toBe("8");
          return Response.json({
            messages: Array.from({ length: 12 }, (_, i) => ({ id: String(i) })),
          });
        }
        const id = url.pathname.split("/").at(-1)!;
        reads.push(id);
        return Response.json({
          id,
          threadId: id,
          labelIds: id === "1" ? ["SPAM"] : id === "2" ? ["TRASH"] : ["INBOX"],
          internalDate: String(Date.now() - (id === "3" ? 8 * 86400000 : 1000)),
          payload: {
            mimeType: "text/plain",
            body: {
              data: Buffer.from("A recent source message").toString("base64url"),
            },
            headers: [{ name: "Subject", value: `Message ${id}` }],
          },
        });
      }),
    );
    const items = await collectGoogle(env, "alice", defaults, "2026-10-25");
    expect(reads).toHaveLength(8);
    expect(items.map((item) => item.id)).toEqual([
      "email-0",
      "email-4",
      "email-5",
      "email-6",
      "email-7",
    ]);
    expect(items.every((item) => item.kind === "email")).toBe(true);
  });
  it("enforces the exact rolling 24-hour window including boundaries and excludes future mail", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T08:30:00.500Z"));
    await storeConnection({ calendar: false, labelId: null, emailMode: "all" });
    const end = Date.now();
    const received = [end - 86400001, end - 86400000, end - 1, end, end + 1];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = new URL(String(input));
        if (url.pathname === "/oauth/token") return Response.json({ access_token: "fixture" });
        if (url.pathname.endsWith("/messages")) {
          expect(url.searchParams.get("q")).toBe(
            `after:${Math.floor((end - 86400000) / 1000) - 1} before:${Math.ceil(end / 1000) + 1} -in:trash -in:spam`,
          );
          return Response.json({ messages: received.map((_, index) => ({ id: String(index) })) });
        }
        const id = url.pathname.split("/").at(-1)!;
        return Response.json({
          id,
          internalDate: String(received[Number(id)]),
          labelIds: ["INBOX"],
          payload: {
            mimeType: "text/plain",
            body: { data: Buffer.from("Fixture").toString("base64url") },
          },
        });
      }),
    );
    const items = await collectGoogle(env, "alice", defaults, "2026-10-25");
    expect(items.map((item) => item.id)).toEqual(["email-1", "email-2", "email-3"]);
  });
  it("fails explicitly on revoked consent and skips attachments and HTML bodies", async () => {
    await storeConnection();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("denied", { status: 401 })),
    );
    await expect(collectGoogle(env, "alice", defaults, "2026-10-24")).rejects.toThrow("Reconnect");
    const failedLabels = await req("/v1/google/labels");
    expect(failedLabels.status).toBe(502);
    expect(await failedLabels.json()).toEqual({
      error: "Google authorization needs attention. Reconnect in Settings.",
    });
    expect(
      plainBody({
        mimeType: "multipart/mixed",
        parts: [
          {
            mimeType: "text/plain",
            body: { data: Buffer.from("Read me").toString("base64url") },
          },
          {
            mimeType: "text/html",
            body: {
              data: Buffer.from("<script>bad</script>").toString("base64url"),
            },
          },
          { mimeType: "application/pdf", body: { attachmentId: "skip" } },
          {
            mimeType: "text/plain",
            filename: "private-attachment.txt",
            body: {
              data: Buffer.from("Do not include this attachment").toString("base64url"),
            },
          },
        ],
      }),
    ).toBe("Read me");
  });
  it("disconnects only the requesting reader", async () => {
    await storeConnection();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({})),
    );
    expect((await req("/v1/google/disconnect", "POST", undefined, bob)).status).toBe(200);
    expect(await (await req("/v1/google")).json()).toMatchObject({
      connected: true,
    });
    expect((await req("/v1/google/disconnect", "POST")).status).toBe(200);
    expect(await (await req("/v1/google")).json()).toMatchObject({
      connected: false,
    });
  });
});

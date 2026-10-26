import { createPublisherApi } from "../../workers/publisher/src/adapters/http/publisher-api";
import { createApp } from "../src/app";
import type { Env } from "../src/config/env";
import { defaults, defaultSources } from "@news4you/shared";
import { generateKeyPair, SignJWT, createLocalJWKSet, exportJWK } from "jose";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";

const content = {
  headline: "A thoughtful day",
  intro: "Your daily perspective.",
  sections: [
    {
      title: "Today",
      stories: [
        {
          title: "A discovery",
          body: "A fixed fixture summary.",
          sourceIds: ["fixture"],
        },
      ],
    },
  ],
};

const internal = {
  Authorization: "Bearer internal-test-secret",
  "Content-Type": "application/json",
};

let mf: Miniflare, env: Env, app: ReturnType<typeof createApp>, alice: string, bob: string;

const now = () => new Date().toISOString();

const items = [
  {
    id: "fixture",
    title: "A discovery",
    content: "A fixed fixture summary.",
    url: "https://example.com/discovery",
    publishedAt: now(),
    fingerprint: "a discovery",
    kind: "rss",
  },
];

async function publisher(path: string, body: unknown = {}) {
  return app.request(path, { method: "POST", headers: internal, body: JSON.stringify(body) }, env);
}

async function req(path: string, token = alice, method = "GET", body?: unknown) {
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
  const directory = new URL("../../../packages/database/migrations/", import.meta.url);
  for (const file of readdirSync(directory)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    for (const statement of readFileSync(new URL(file, directory), "utf8")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.prepare(statement).run();
  }
  const keys = await generateKeyPair("RS256");
  const jwk = await exportJWK(keys.publicKey);
  jwk.kid = "test";
  app = createApp(createLocalJWKSet({ keys: [jwk] }));
  async function token(sub: string, aud = "news4you-test", expired = false) {
    return new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer("https://test.auth0.com/")
      .setAudience(aud)
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime(expired ? "0s" : "1h")
      .sign(keys.privateKey);
  }
  alice = await token("alice");
  bob = await token("bob");
  env = {
    DB: db as unknown as D1Database,
    AUTH0_DOMAIN: "test.auth0.com",
    AUTH0_AUDIENCE: "news4you-test",
    DASHBOARD_ORIGIN: "https://news4you.njabulomajozi.com",
    PUBLISHER_TOKEN: "internal-test-secret",
  };
  badAudience = await token("alice", "other");
  expired = await token("alice", "news4you-test", true);
});

let badAudience: string, expired: string;

afterAll(async () => {
  await mf?.dispose();
});

describe("authentication, ownership and validation", () => {
  it("rejects missing, forged, expired and wrong-audience tokens", async () => {
    for (const t of ["", "forged", badAudience, expired])
      expect((await req("/v1/preferences", t)).status).toBe(401);
  });
  it("keeps preferences private and validates input", async () => {
    expect((await req("/v1/preferences")).status).toBe(200);
    expect(
      (
        await req("/v1/preferences", alice, "PUT", {
          ...defaults,
          interests: ["Space"],
        })
      ).status,
    ).toBe(200);
    expect(((await (await req("/v1/preferences", bob)).json()) as any).interests).toEqual(
      defaults.interests,
    );
    expect(
      (
        await req("/v1/preferences", alice, "PUT", {
          ...defaults,
          readingMinutes: 99,
        })
      ).status,
    ).toBe(400);
  });
  it("persists added, edited, disabled and removed RSS feeds per reader, including an empty selection", async () => {
    expect(await (await req("/v1/sources", bob)).json()).toEqual(defaultSources);
    const feed = { id: "my-feed", name: "My feed", url: "https://example.com/rss", enabled: true };
    expect((await req("/v1/sources", alice, "PUT", [feed])).status).toBe(200);
    expect(await (await req("/v1/sources")).json()).toEqual([feed]);
    const edited = {
      ...feed,
      name: "Renamed feed",
      url: "https://example.com/atom",
      enabled: false,
    };
    expect((await req("/v1/sources", alice, "PUT", [edited])).status).toBe(200);
    expect(await (await req("/v1/sources")).json()).toEqual([edited]);
    expect(
      (await req("/v1/sources", alice, "PUT", [{ ...feed, url: "http://example.com/rss" }])).status,
    ).toBe(400);
    expect(
      (
        await req(
          "/v1/sources",
          alice,
          "PUT",
          Array.from({ length: 11 }, (_, i) => ({ ...feed, id: `feed-${i}` })),
        )
      ).status,
    ).toBe(400);
    expect(await (await req("/v1/sources")).json()).toEqual([edited]);
    expect((await req("/v1/sources", alice, "PUT", [])).status).toBe(200);
    expect(await (await req("/v1/sources")).json()).toEqual([]);
    expect(await (await req("/v1/sources", bob)).json()).toEqual(defaultSources);
  });
  it("allows only configured CORS origins", async () => {
    for (const [origin, allowed] of [
      ["https://evil.example", false],
      ["http://localhost:5173", true],
    ] as const) {
      const r = await app.request("/health", { headers: { Origin: origin } }, env);
      expect(!!r.headers.get("Access-Control-Allow-Origin")).toBe(allowed);
    }
  });
  it("protects internal operations", async () =>
    expect((await req("/internal/claim")).status).toBe(401));
});

describe("generation lifecycle", () => {
  let runId: string, leaseToken: string, editionId: string;
  it("starts missing and accepts one daily run for repeated requests", async () => {
    expect(((await (await req("/v1/today")).json()) as any).state).toBe("missing");
    const first = await req("/v1/generations", alice, "POST", {});
    expect(first.status).toBe(202);
    runId = ((await first.json()) as any).runId;
    const second = await req("/v1/generations", alice, "POST", {});
    expect(((await second.json()) as any).runId).toBe(runId);
    expect(((await (await req("/v1/today")).json()) as any).state).toBe("generating");
    expect((await req("/v1/runs/" + runId, bob)).status).toBe(404);
  });
  it("claims a run exactly once and rejects invalid output", async () => {
    const client = createPublisherApi({
      baseUrl: "https://api.example.com",
      token: env.PUBLISHER_TOKEN,
      fetch: async (input, init) =>
        app.request(input instanceof Request ? input : String(input), init, env),
    });
    const claimed = await client.claim();
    expect(claimed).not.toBeNull();
    leaseToken = claimed!.leaseToken;
    expect(claimed!.id).toBe(runId);
    expect(await client.claim()).toBeNull();
    expect(await client.personal(claimed!)).toEqual({ items: [] });
    expect(
      (
        await publisher(`/internal/runs/${runId}/personal`, {
          leaseToken: crypto.randomUUID(),
        })
      ).status,
    ).toBe(409);
    expect(
      await (await publisher(`/internal/runs/${runId}/personal`, { leaseToken })).json(),
    ).toEqual({ items: [] });
    const invalid = structuredClone(content);
    invalid.sections[0].stories[0].sourceIds = ["fabricated"];
    expect(
      (
        await publisher(`/internal/runs/${runId}/result`, {
          leaseToken,
          content: invalid,
          items,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await publisher(`/internal/runs/${runId}/result`, {
          leaseToken: crypto.randomUUID(),
          content,
          items,
        })
      ).status,
    ).toBe(409);
  });
  it("publishes and preserves references with owned edition access", async () => {
    const agenda = [
      {
        title: "Fixture meeting",
        detail: "10:00 in Africa/Johannesburg",
        url: "https://calendar.google.com/",
      },
    ];
    const r = await publisher(`/internal/runs/${runId}/result`, {
      leaseToken,
      content,
      items,
      agenda,
    });
    expect(r.status).toBe(201);
    editionId = ((await r.json()) as any).editionId;
    const today = (await (await req("/v1/today")).json()) as any;
    expect(today.state).toBe("ready");
    expect(today.edition.references[0].id).toBe("fixture");
    expect(today.edition.agenda).toEqual(agenda);
    expect((await req(`/v1/editions/${editionId}`, bob)).status).toBe(404);
    expect(
      (
        await publisher(`/internal/runs/${runId}/result`, {
          leaseToken,
          content,
          items,
        })
      ).status,
    ).toBe(409);
  });
  it("rejects feedback on another reader’s edition", async () => {
    expect((await req("/v1/feedback", bob, "POST", { editionId, rating: "helpful" })).status).toBe(
      404,
    );
    expect(
      (
        await req("/v1/feedback", alice, "POST", {
          editionId,
          rating: "helpful",
        })
      ).status,
    ).toBe(200);
  });
  it("tracks previews separately and recovers abandoned runs", async () => {
    const r = await req("/v1/generations", alice, "POST", { kind: "preview" });
    const id = ((await r.json()) as any).runId;
    const duplicate = await req("/v1/generations", alice, "POST", {
      kind: "preview",
    });
    expect(((await duplicate.json()) as any).runId).toBe(id);
    const claim = (await (await publisher("/internal/claim")).json()) as any;
    await env.DB.prepare("UPDATE generation_runs SET lease_until=? WHERE id=?")
      .bind("2000-01-01T00:00:00.000Z", id)
      .run();
    expect(
      (
        await publisher(`/internal/runs/${id}/result`, {
          leaseToken: claim.run.leaseToken,
          content,
          items,
        })
      ).status,
    ).toBe(409);
    const recovered = (await (await publisher("/internal/claim")).json()) as any;
    expect(recovered.run.id).toBe(id);
    expect(recovered.run.leaseToken).not.toBe(claim.run.leaseToken);
    await env.DB.prepare("UPDATE generation_runs SET attempts=3,lease_until=? WHERE id=?")
      .bind("2000-01-01T00:00:00.000Z", id)
      .run();
    await publisher("/internal/claim");
    expect(((await (await req(`/v1/runs/${id}`)).json()) as any).status).toBe("failed");
  });
  it("cleans seven-day source content while retaining published editions", async () => {
    await env.DB.prepare("UPDATE source_items SET collected_at=?")
      .bind("2000-01-01T00:00:00.000Z")
      .run();
    await publisher("/internal/schedule");
    expect((await env.DB.prepare("SELECT count(*) AS n FROM source_items").first<any>()).n).toBe(0);
    expect((await req(`/v1/editions/${editionId}`)).status).toBe(200);
    expect(
      ((await (await req(`/v1/editions/${editionId}`)).json()) as any).references,
    ).toHaveLength(1);
  });
});

it("dispatches concurrent duplicate requests once and permits a later recovery attempt", async () => {
  const previousWorkflow = env.PUBLICATION;
  const dispatch = vi.fn().mockResolvedValue({ id: "hosted-instance" });
  env.PUBLICATION = { create: dispatch } as unknown as NonNullable<typeof env.PUBLICATION>;
  try {
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => req("/v1/generations", bob, "POST", { kind: "preview" })),
    );
    expect(responses.every((r) => r.status === 202)).toBe(true);
    const results = (await Promise.all(responses.map((r) => r.json()))) as {
      runId: string;
      dispatch: string;
    }[];
    expect(new Set(results.map((r) => r.runId)).size).toBe(1);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      id: expect.stringContaining(results[0].runId),
      params: { runId: results[0].runId },
    });
    expect(results.filter((r) => r.dispatch === "dispatched")).toHaveLength(1);
    await env.DB.prepare("UPDATE generation_runs SET dispatch_requested_at=? WHERE id=?")
      .bind("2000-01-01T00:00:00.000Z", results[0].runId)
      .run();
    dispatch.mockRejectedValue(new Error("Workflow unavailable"));
    const retry = await req("/v1/generations", bob, "POST", {
      kind: "preview",
    });
    expect(retry.status).toBe(202);
    expect(((await retry.json()) as { dispatch: string }).dispatch).toBe(
      "awaiting-hourly-publisher",
    );
    await req("/v1/generations", bob, "POST", { kind: "preview" });
    expect(dispatch).toHaveBeenCalledTimes(2);
  } finally {
    env.PUBLICATION = previousWorkflow;
    vi.unstubAllGlobals();
  }
});

it("checks pending work without claiming a lease and retires exhausted runs", async () => {
  const isolated = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("ok")}}',
    compatibilityDate: "2026-07-30",
    d1Databases: ["DB"],
  });
  try {
    const db = await isolated.getD1Database("DB");
    const directory = new URL("../../../packages/database/migrations/", import.meta.url);
    for (const file of readdirSync(directory)
      .filter((name) => name.endsWith(".sql"))
      .sort())
      for (const statement of readFileSync(new URL(file, directory), "utf8")
        .split(";")
        .map((sql) => sql.trim())
        .filter(Boolean))
        await db.prepare(statement).run();
    const bindings = { ...env, DB: db as unknown as D1Database };
    const pending = (headers: Record<string, string> = internal) =>
      app.request("/internal/pending", { method: "POST", headers }, bindings);
    expect((await pending({})).status).toBe(401);
    expect(await (await pending()).json()).toEqual({ pending: false });
    await db.prepare("INSERT INTO readers(id) VALUES('preflight')").run();
    await db
      .prepare(
        "INSERT INTO generation_runs(id,reader_id,local_date,kind,status,created_at,updated_at) VALUES('preflight-run','preflight','2026-10-25','daily','pending',?,?)",
      )
      .bind(now(), now())
      .run();
    expect(await (await pending()).json()).toEqual({ pending: true });
    expect(await db.prepare("SELECT attempts,lease_token FROM generation_runs").first()).toEqual({
      attempts: 0,
      lease_token: null,
    });
    await db
      .prepare("UPDATE generation_runs SET status='running',attempts=2,lease_until=?")
      .bind(new Date(Date.now() + 60000).toISOString())
      .run();
    expect(await (await pending()).json()).toEqual({ pending: false });
    await db.prepare("UPDATE generation_runs SET lease_until='2000-01-01'").run();
    expect(await (await pending()).json()).toEqual({ pending: true });
    await db.prepare("UPDATE generation_runs SET attempts=3").run();
    expect(await (await pending()).json()).toEqual({ pending: false });
    expect(await db.prepare("SELECT status FROM generation_runs").first()).toEqual({
      status: "failed",
    });
  } finally {
    await isolated.dispose();
  }
});

it("does not log persistence error messages or bound private data", async () => {
  const marker = "synthetic-private-persistence-text";
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const failingDatabase = {
      prepare() {
        throw new Error(marker);
      },
    } as unknown as D1Database;
    const response = await app.request(
      "/v1/preferences",
      { headers: { Authorization: `Bearer ${alice}` } },
      { ...env, DB: failingDatabase },
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Service unavailable" });
    expect(log).toHaveBeenCalledWith("Request failed");
    expect(JSON.stringify(log.mock.calls)).not.toContain(marker);
  } finally {
    log.mockRestore();
  }
});

import { createApp } from "../src/app";
import type { Env } from "../src/config/env";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

let mf: Miniflare, env: Env, app: ReturnType<typeof createApp>;

let nextReader = 0;

let sign: (reader: string) => Promise<string>;

beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("ok")}}',
    compatibilityDate: "2026-07-30",
    d1Databases: ["DB"],
  });
  const db = await mf.getD1Database("DB");
  const dir = new URL("../../../packages/database/migrations/", import.meta.url);
  for (const file of readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort())
    for (const sql of readFileSync(new URL(file, dir), "utf8")
      .split(";")
      .map((text) => text.trim())
      .filter(Boolean))
      await db.prepare(sql).run();
  const pair = await generateKeyPair("RS256");
  const key = await exportJWK(pair.publicKey);
  key.kid = "stream-test";
  sign = (reader) =>
    new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: key.kid })
      .setIssuer("https://test.auth0.com/")
      .setAudience("test-api")
      .setSubject(reader)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(pair.privateKey);
  app = createApp(createLocalJWKSet({ keys: [key] }));
  env = {
    DB: db as unknown as D1Database,
    AUTH0_DOMAIN: "test.auth0.com",
    AUTH0_AUDIENCE: "test-api",
    DASHBOARD_ORIGIN: "https://paper.example",
    PUBLISHER_TOKEN: "test-publisher",
  };
});

afterAll(async () => mf.dispose());

const content = {
  headline: "A finished edition",
  intro: "A short briefing",
  sections: [
    {
      title: "News",
      stories: [
        { title: "Fixture story", body: "A public fixture story.", sourceIds: ["fixture"] },
      ],
    },
  ],
};

async function fixture() {
  const token = await sign(`stream-reader-${nextReader++}`);
  const created = (await (await request("/v1/generations", token, {})).json()) as { runId: string };
  const { run } = (await (await request("/internal/claim", "test-publisher", {})).json()) as {
    run: { id: string; leaseToken: string };
  };
  expect(run.id).toBe(created.runId);
  const path = `/internal/runs/${run.id}`;
  const progress = (sequence: number, headline: string) =>
    request(path + "/progress", "test-publisher", {
      leaseToken: run.leaseToken,
      sequence,
      stage: "writing",
      draft: { headline },
      references: [],
    });
  return { token, run, path, progress };
}

async function request(path: string, token: string, body?: unknown) {
  return app.request(
    path,
    {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
    env,
  );
}

const item = {
  id: "fixture",
  title: "Fixture story",
  content: "A public fixture story.",
  kind: "rss",
  url: "https://example.com/news",
  publishedAt: new Date().toISOString(),
  fingerprint: "fixture-story",
};

describe("authenticated live edition drafts", () => {
  it("streams successive drafts before publication and restores the latest snapshot on reconnect", async () => {
    const { token, run, path, progress } = await fixture();
    expect((await progress(1, "A partial")).status).toBe(200);
    const response = await request(`/v1/runs/${run.id}/events`, token);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    expect(decoder.decode((await reader.read()).value)).toContain("A partial");
    expect(await (await request("/v1/editions", token)).json()).toEqual([]);
    expect((await progress(2, "A partial headline, growing")).status).toBe(200);
    expect(decoder.decode((await reader.read()).value)).toContain("A partial headline, growing");
    await reader.cancel();
    const reconnect = await request(`/v1/runs/${run.id}/events`, token);
    const resumed = reconnect.body!.getReader();
    expect(decoder.decode((await resumed.read()).value)).toContain("A partial headline, growing");
    expect(
      (
        await request(path + "/result", "test-publisher", {
          leaseToken: run.leaseToken,
          content,
          items: [item],
        })
      ).status,
    ).toBe(201);
    expect(decoder.decode((await resumed.read()).value)).toContain('"status":"completed"');
    await resumed.cancel();
    expect(await (await request("/v1/today", token)).json()).toMatchObject({
      state: "ready",
      edition: { content },
    });
  });
  it("rejects other readers, wrong or expired leases, and out-of-order updates", async () => {
    const { token, run, path, progress } = await fixture();
    expect((await app.request(`/v1/runs/${run.id}/events`, {}, env)).status).toBe(401);
    expect((await request(`/v1/runs/${run.id}/events`, await sign("another-reader"))).status).toBe(
      404,
    );
    expect((await request(path + "/progress", token, {})).status).toBe(401);
    expect((await progress(2, "Latest")).status).toBe(200);
    expect((await progress(1, "Old")).status).toBe(409);
    expect(
      (
        await request(path + "/progress", "test-publisher", {
          leaseToken: crypto.randomUUID(),
          sequence: 3,
          stage: "writing",
          draft: { headline: "Wrong lease" },
        })
      ).status,
    ).toBe(409);
    await env.DB.prepare("UPDATE generation_runs SET lease_until='2000-01-01' WHERE id=?")
      .bind(run.id)
      .run();
    expect((await progress(3, "Expired")).status).toBe(409);
    expect(await (await request(`/v1/runs/${run.id}`, token)).json()).toMatchObject({
      progress: { draft: { headline: "Latest" } },
    });
    await env.DB.prepare("UPDATE generation_runs SET status='failed' WHERE id=?")
      .bind(run.id)
      .run();
  });
  it("keeps a failed draft unsaved, emits failure, and clears it on explicit retry", async () => {
    const { token, run, path, progress } = await fixture();
    await progress(1, "An unfinished draft");
    const invalid = {
      ...content,
      sections: [
        {
          title: "News",
          stories: [{ title: "Invalid", body: "Unverified", sourceIds: ["invented"] }],
        },
      ],
    };
    expect(
      (
        await request(path + "/result", "test-publisher", {
          leaseToken: run.leaseToken,
          content: invalid,
          items: [item],
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(path + "/fail", "test-publisher", {
          leaseToken: run.leaseToken,
          error: "Validation failed",
        })
      ).status,
    ).toBe(200);
    const response = await request(`/v1/runs/${run.id}/events`, token);
    const text = await response.text();
    expect(text).toContain('"status":"failed"');
    expect(text).toContain("An unfinished draft");
    expect(await (await request("/v1/editions", token)).json()).toEqual([]);
    await request("/v1/generations", token, {});
    expect(await (await request(`/v1/runs/${run.id}`, token)).json()).toMatchObject({
      status: "pending",
      attempts: 0,
    });
    expect(
      ((await (await request(`/v1/runs/${run.id}`, token)).json()) as { progress?: unknown })
        .progress,
    ).toBeUndefined();
    expect((await progress(2, "Stale attempt")).status).toBe(409);
    await env.DB.prepare("UPDATE generation_runs SET status='failed' WHERE id=?")
      .bind(run.id)
      .run();
  });
});

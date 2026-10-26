import { createDatabaseClient, type DatabaseBinding } from "../src/client";
import { readers, preferences, generationRuns, editions } from "../src/schema";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, expect, it } from "vitest";

let db: ReturnType<typeof createDatabaseClient>;

let worker: Miniflare;

beforeAll(async () => {
  worker = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("ok")}}',
    compatibilityDate: "2026-07-30",
    d1Databases: ["DB"],
  });
  const binding = await worker.getD1Database("DB");
  const directory = new URL("../migrations/", import.meta.url);
  for (const name of readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    for (const statement of readFileSync(new URL(name, directory), "utf8")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await binding.prepare(statement).run();
  }
  db = createDatabaseClient(binding as unknown as DatabaseBinding);
});

afterAll(async () => {
  await worker?.dispose();
});

it("uses the domain schemas through the D1 client against every committed migration", async () => {
  await db.insert(readers).values({ id: "schema-fixture" });
  await db.insert(preferences).values({ readerId: "schema-fixture", data: "{}" });
  const timestamp = "2026-10-25T06:00:00.000Z";
  await db.insert(generationRuns).values({
    id: "schema-run",
    readerId: "schema-fixture",
    localDate: "2026-10-25",
    kind: "daily",
    status: "completed",
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await db.insert(editions).values({
    id: "schema-edition",
    readerId: "schema-fixture",
    localDate: "2026-10-25",
    kind: "daily",
    createdAt: timestamp,
    readingMinutes: 5,
    content: "{}",
    runId: "schema-run",
  });
  expect(await db.select().from(editions)).toEqual([
    expect.objectContaining({ id: "schema-edition", agenda: "[]", runId: "schema-run" }),
  ]);
  expect(await db.select().from(readers)).toEqual([
    expect.objectContaining({ id: "schema-fixture", createdAt: expect.any(String) }),
  ]);
});

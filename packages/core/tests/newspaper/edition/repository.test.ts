import { item, content } from "../../fixtures/publication";
import {
  createReaderRepository,
  createGenerationRepository,
  createEditionRepository,
} from "@news4you/core";
import {
  createDatabaseClient,
  type DatabaseBinding,
  type DatabaseClient,
} from "@news4you/database/client";
import { editions, editionItems, generationRuns } from "@news4you/database/schema";
import { eq } from "drizzle-orm";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, expect, it } from "vitest";

let db: DatabaseClient;

let worker: Miniflare;

beforeAll(async () => {
  worker = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("ok")}}',
    compatibilityDate: "2026-07-30",
    d1Databases: ["DB"],
  });
  const binding = await worker.getD1Database("DB");
  const directory = new URL("../../../../database/migrations/", import.meta.url);
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

it("claims one run under concurrent publishers and saves one atomic edition", async () => {
  await createReaderRepository(db).ensureReader("concurrent-reader");
  const queued = await createGenerationRepository(db).enqueue(
    "concurrent-reader",
    "2026-10-25",
    "daily",
  );
  const claims = (
    await Promise.all([
      createGenerationRepository(db).claimRun(),
      createGenerationRepository(db).claimRun(),
    ])
  ).filter((run) => run !== null);
  expect(claims).toHaveLength(1);
  expect(claims[0].id).toBe(queued.id);
  const claim = claims[0];
  const record = await createGenerationRepository(db).findLeasedRun(claim.id, claim.leaseToken);
  expect(record).toBeDefined();
  const editionId = await createEditionRepository(db).savePublishedEdition(
    record!,
    { leaseToken: claim.leaseToken, content, agenda: [], emails: [], items: [item] },
    5,
  );
  expect(await db.select().from(editions).where(eq(editions.id, editionId))).toHaveLength(1);
  expect(
    await db.select().from(editionItems).where(eq(editionItems.editionId, editionId)),
  ).toHaveLength(1);
  expect(await db.select().from(generationRuns).where(eq(generationRuns.id, queued.id))).toEqual([
    expect.objectContaining({ status: "completed", editionId, attempts: 1, leaseToken: null }),
  ]);
});

it("rolls back all publication writes if the captured lease expires before insertion", async () => {
  await createReaderRepository(db).ensureReader("expired-reader");
  const queued = await createGenerationRepository(db).enqueue(
    "expired-reader",
    "2026-10-25",
    "daily",
  );
  const claim = await createGenerationRepository(db).claimRun();
  expect(claim?.id).toBe(queued.id);
  const record = await createGenerationRepository(db).findLeasedRun(queued.id, claim!.leaseToken);
  await db
    .update(generationRuns)
    .set({ leaseUntil: "2000-01-01T00:00:00.000Z" })
    .where(eq(generationRuns.id, queued.id));
  await expect(
    createEditionRepository(db).savePublishedEdition(
      record!,
      { leaseToken: claim!.leaseToken, content, agenda: [], emails: [], items: [item] },
      5,
    ),
  ).rejects.toThrow();
  expect(await db.select().from(editions).where(eq(editions.readerId, "expired-reader"))).toEqual(
    [],
  );
  expect(await db.select().from(generationRuns).where(eq(generationRuns.id, queued.id))).toEqual([
    expect.objectContaining({ status: "running", editionId: null, leaseToken: claim!.leaseToken }),
  ]);
});

it("claims only the run requested by a hosted workflow", async () => {
  const repository = createGenerationRepository(db);
  for (const reader of ["scoped-first", "scoped-second"])
    await createReaderRepository(db).ensureReader(reader);
  const first = await repository.enqueue("scoped-first", "2026-10-25", "preview");
  const second = await repository.enqueue("scoped-second", "2026-10-25", "preview");
  expect((await repository.claimRun(second.id))?.id).toBe(second.id);
  expect(await repository.claimRun(second.id)).toBeNull();
  expect(await repository.claimRun("nonexistent-run")).toBeNull();
  expect((await repository.claimRun(first.id))?.id).toBe(first.id);
});

import type { DatabaseClient } from "@news4you/database/client";
import { generationRuns, editions, editionReferences } from "@news4you/database/schema";
import type { GenerationProgress } from "@news4you/shared";
import { and, or, eq, lt, gt, gte, isNull, inArray, asc, desc, sql } from "drizzle-orm";

export type GenerationRepositoryPort = Pick<GenerationRepository, keyof GenerationRepository>;

export type LeasedRunRecord = typeof generationRuns.$inferSelect;

const available = (now: string) =>
  and(
    or(
      eq(generationRuns.status, "pending"),
      and(eq(generationRuns.status, "running"), lt(generationRuns.leaseUntil, now)),
    ),
    lt(generationRuns.attempts, 3),
  );

export const createGenerationRepository = (db: DatabaseClient): GenerationRepository =>
  new GenerationRepository(db);

async function expireInterruptedRuns(db: DatabaseClient, now: string) {
  await db
    .update(generationRuns)
    .set({ status: "failed", error: "Publisher interrupted too often", updatedAt: now })
    .where(
      and(
        eq(generationRuns.status, "running"),
        lt(generationRuns.leaseUntil, now),
        gte(generationRuns.attempts, 3),
      ),
    );
}

export class GenerationRepository {
  constructor(private db: DatabaseClient) {}

  async enqueue(reader: string, date: string, kind: "daily" | "preview") {
    const now = new Date().toISOString();
    await this.db
      .insert(generationRuns)
      .values({
        id: crypto.randomUUID(),
        readerId: reader,
        localDate: date,
        kind,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
    const row = await this.db
      .select()
      .from(generationRuns)
      .where(
        and(
          eq(generationRuns.readerId, reader),
          eq(generationRuns.kind, kind),
          kind === "daily"
            ? eq(generationRuns.localDate, date)
            : or(
                inArray(generationRuns.status, ["pending", "running"]),
                eq(generationRuns.localDate, date),
              ),
        ),
      )
      .orderBy(desc(generationRuns.createdAt))
      .limit(1)
      .get();
    if (!row) throw new Error("Generation run could not be queued");
    return row;
  }
  async hasPendingRuns() {
    const now = new Date().toISOString();
    await expireInterruptedRuns(this.db, now);
    return !!(await this.db
      .select({ id: generationRuns.id })
      .from(generationRuns)
      .where(available(now))
      .limit(1)
      .get());
  }
  async pendingRunIds() {
    const now = new Date().toISOString();
    await expireInterruptedRuns(this.db, now);
    return this.db
      .select({ id: generationRuns.id })
      .from(generationRuns)
      .where(available(now))
      .orderBy(asc(generationRuns.createdAt))
      .limit(25);
  }
  async claimRun(id?: string): Promise<(LeasedRunRecord & { leaseToken: string }) | null> {
    const now = new Date().toISOString(),
      lease = crypto.randomUUID();
    await expireInterruptedRuns(this.db, now);
    // Keep selection inside the update: concurrent workers cannot claim the same row.
    const nextRun = this.db
      .select({ id: generationRuns.id })
      .from(generationRuns)
      .where(and(available(now), id ? eq(generationRuns.id, id) : undefined))
      .orderBy(asc(generationRuns.createdAt))
      .limit(1);
    const [run] = await this.db
      .update(generationRuns)
      .set({
        status: "running",
        attempts: sql`${generationRuns.attempts} + 1`,
        progress: null,
        leaseToken: lease,
        leaseUntil: new Date(Date.now() + 8 * 60000).toISOString(),
        updatedAt: now,
      })
      .where(eq(generationRuns.id, nextRun))
      .returning();
    if (!run) return null;
    return run ? { ...run, leaseToken: lease } : null;
  }
  async findLeasedRun(id: string, lease: string) {
    return this.db
      .select()
      .from(generationRuns)
      .where(leaseCondition(id, lease, new Date().toISOString()))
      .get();
  }
  async failRun(id: string, value: { error: string; leaseToken: string }) {
    const now = new Date().toISOString();
    const rows = await this.db
      .update(generationRuns)
      .set({
        status: "failed",
        error: value.error,
        updatedAt: now,
      })
      .where(leaseCondition(id, value.leaseToken, now))
      .returning({ id: generationRuns.id });
    return rows.length > 0;
  }
  async resetFailedRun(id: string) {
    await this.db
      .update(generationRuns)
      .set({
        status: "pending",
        attempts: 0,
        progress: null,
        error: null,
        dispatchRequestedAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(generationRuns.id, id), eq(generationRuns.status, "failed")));
  }
  async saveProgress(id: string, lease: string, progress: GenerationProgress) {
    const now = new Date().toISOString();
    const rows = await this.db
      .update(generationRuns)
      .set({ progress: JSON.stringify(progress), updatedAt: now })
      .where(
        and(
          leaseCondition(id, lease, now),
          or(
            isNull(generationRuns.progress),
            sql`json_extract(${generationRuns.progress}, '$.sequence') < ${progress.sequence}`,
          ),
        ),
      )
      .returning({ id: generationRuns.id });
    return rows.length > 0;
  }
  async claimDispatch(id: string) {
    const now = new Date().toISOString();
    const rows = await this.db
      .update(generationRuns)
      .set({ dispatchRequestedAt: now })
      .where(
        and(
          eq(generationRuns.id, id),
          eq(generationRuns.status, "pending"),
          or(
            isNull(generationRuns.dispatchRequestedAt),
            lt(generationRuns.dispatchRequestedAt, new Date(Date.now() - 60000).toISOString()),
          ),
        ),
      )
      .returning({ id: generationRuns.id });
    return rows.length > 0;
  }
  async coveredFingerprints(reader: string) {
    const rows = await this.db
      .selectDistinct({ fingerprint: editionReferences.fingerprint })
      .from(editionReferences)
      .innerJoin(editions, eq(editions.id, editionReferences.editionId))
      .where(eq(editions.readerId, reader));
    return rows.map((row) => row.fingerprint);
  }
}

export function leaseCondition(id: string, lease: string, now: string) {
  return and(
    eq(generationRuns.id, id),
    eq(generationRuns.leaseToken, lease),
    eq(generationRuns.status, "running"),
    gt(generationRuns.leaseUntil, now),
  );
}

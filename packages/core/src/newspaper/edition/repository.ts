import { leaseCondition, type LeasedRunRecord } from "../generation/repository";
import type { DatabaseClient } from "@news4you/database/client";
import {
  editions,
  generationRuns,
  editionReferences,
  editionItems,
  sourceItems,
  feedback,
} from "@news4you/database/schema";
import { generationProgressSchema } from "@news4you/shared";
import type { Edition, GenerationRun, PublicationResult, Feedback } from "@news4you/shared";
import { and, eq, desc, sql } from "drizzle-orm";

export type EditionRepositoryPort = Pick<EditionRepository, keyof EditionRepository>;

export const createEditionRepository = (db: DatabaseClient): EditionRepository =>
  new EditionRepository(db);

export class EditionRepository {
  constructor(private db: DatabaseClient) {}
  async getEdition(readerId: string, id: string): Promise<Edition | null> {
    const row = await this.db
      .select()
      .from(editions)
      .where(and(eq(editions.readerId, readerId), eq(editions.id, id)))
      .get();
    if (!row) return null;
    const references = await this.db
      .select({ data: editionReferences.data })
      .from(editionReferences)
      .where(eq(editionReferences.editionId, id));
    return {
      id: row.id,
      localDate: row.localDate,
      kind: row.kind,
      createdAt: row.createdAt,
      readingMinutes: row.readingMinutes,
      content: JSON.parse(row.content),
      agenda: JSON.parse(row.agenda),
      emails: JSON.parse(row.emails),
      references: references.map((reference) => JSON.parse(reference.data)),
    };
  }
  async listEditions(readerId: string): Promise<Edition[]> {
    const rows = await this.db
      .select({ id: editions.id })
      .from(editions)
      .where(eq(editions.readerId, readerId))
      .orderBy(desc(editions.createdAt))
      .limit(60);
    return (await Promise.all(rows.map((row) => this.getEdition(readerId, row.id)))).filter(
      (row): row is Edition => row !== null,
    );
  }
  async getRun(readerId: string, id: string): Promise<GenerationRun | null> {
    const row = await this.db
      .select()
      .from(generationRuns)
      .where(and(eq(generationRuns.readerId, readerId), eq(generationRuns.id, id)))
      .get();
    return row
      ? {
          id: row.id,
          localDate: row.localDate,
          kind: row.kind,
          status: row.status,
          editionId: row.editionId ?? undefined,
          error: row.error ?? undefined,
          attempts: row.attempts,
          createdAt: row.createdAt,
          progress: row.progress
            ? generationProgressSchema.parse(JSON.parse(row.progress))
            : undefined,
        }
      : null;
  }

  async savePublishedEdition(
    run: LeasedRunRecord,
    data: PublicationResult,
    readingMinutes: number,
  ) {
    const id = crypto.randomUUID(),
      now = new Date().toISOString();
    const used = new Set(
      data.content.sections.flatMap((section) =>
        section.stories.flatMap((story) => story.sourceIds),
      ),
    );
    const refs = data.items.filter((item) => used.has(item.id));
    // The guarded INSERT SELECT and following writes form one atomic D1 batch.
    // If the lease expires before the insert, child-row foreign keys roll back the batch.
    const edition = this.db.insert(editions).select(
      this.db
        .select({
          id: sql<string>`${id}`.as("id"),
          readerId: generationRuns.readerId,
          localDate: generationRuns.localDate,
          kind: generationRuns.kind,
          createdAt: sql<string>`${now}`.as("created_at"),
          readingMinutes: sql<number>`${readingMinutes}`.as("reading_minutes"),
          content: sql<string>`${JSON.stringify(data.content)}`.as("content"),
          agenda: sql<string>`${JSON.stringify(data.agenda)}`.as("agenda"),
          emails: sql<string>`${JSON.stringify(data.emails)}`.as("emails"),
          runId: generationRuns.id,
        })
        .from(generationRuns)
        .where(leaseCondition(run.id, data.leaseToken, now)),
    );
    await this.db.batch([
      edition,
      this.db
        .insert(editionItems)
        .values(
          data.content.sections
            .flatMap((section) => section.stories)
            .map((story, position) => ({ editionId: id, position, data: JSON.stringify(story) })),
        ),
      ...refs.map((item) =>
        this.db.insert(editionReferences).values({
          editionId: id,
          sourceId: item.id,
          fingerprint: item.fingerprint,
          data: JSON.stringify({
            id: item.id,
            title: item.title,
            url: item.url,
            publishedAt: item.publishedAt,
            fingerprint: item.fingerprint,
          }),
        }),
      ),
      ...data.items.map((item) => {
        const value = {
          id: run.readerId + ":" + item.id,
          readerId: run.readerId,
          fingerprint: item.fingerprint,
          data: JSON.stringify(item),
          collectedAt: now,
        };
        return this.db
          .insert(sourceItems)
          .values(value)
          .onConflictDoUpdate({ target: sourceItems.id, set: value });
      }),
      this.db
        .update(generationRuns)
        .set({
          status: "completed",
          editionId: id,
          error: null,
          leaseToken: null,
          leaseUntil: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(generationRuns.id, run.id),
            eq(generationRuns.leaseToken, data.leaseToken),
            eq(generationRuns.status, "running"),
          ),
        ),
    ]);
    return id;
  }
  async findDailyEdition(reader: string, date: string) {
    return this.db
      .select({ id: editions.id })
      .from(editions)
      .where(
        and(
          eq(editions.readerId, reader),
          eq(editions.localDate, date),
          eq(editions.kind, "daily"),
        ),
      )
      .get();
  }
  async findDailyGeneration(reader: string, date: string) {
    return this.db
      .select({ id: generationRuns.id })
      .from(generationRuns)
      .where(
        and(
          eq(generationRuns.readerId, reader),
          eq(generationRuns.localDate, date),
          eq(generationRuns.kind, "daily"),
        ),
      )
      .get();
  }
  async saveFeedback(reader: string, value: Feedback) {
    const data = {
      readerId: reader,
      editionId: value.editionId,
      rating: value.rating,
      comment: value.comment,
    };
    await this.db
      .insert(feedback)
      .values(data)
      .onConflictDoUpdate({
        target: [feedback.readerId, feedback.editionId],
        set: { rating: value.rating, comment: value.comment },
      });
  }
}

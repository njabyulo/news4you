import { generationRuns } from "../generation";
import { readers } from "../reader";
import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

export const editions = sqliteTable(
  "editions",
  {
    id: text("id").primaryKey(),
    readerId: text("reader_id")
      .notNull()
      .references(() => readers.id),
    localDate: text("local_date").notNull(),
    kind: text("kind", { enum: ["daily", "preview"] }).notNull(),
    createdAt: text("created_at").notNull(),
    readingMinutes: integer("reading_minutes").notNull(),
    content: text("content").notNull(),
    agenda: text("agenda").notNull().default("[]"),
    emails: text("emails").notNull().default("[]"),
    runId: text("run_id")
      .notNull()
      .unique()
      .references(() => generationRuns.id),
  },
  (t) => [
    uniqueIndex("one_daily_edition")
      .on(t.readerId, t.localDate)
      .where(sql`${t.kind}='daily'`),
    index("edition_history").on(t.readerId, t.createdAt),
  ],
);

export const editionItems = sqliteTable(
  "edition_items",
  {
    editionId: text("edition_id")
      .notNull()
      .references(() => editions.id),
    position: integer("position").notNull(),
    data: text("data").notNull(),
  },
  (t) => [primaryKey({ columns: [t.editionId, t.position] })],
);

export const editionReferences = sqliteTable(
  "edition_references",
  {
    editionId: text("edition_id")
      .notNull()
      .references(() => editions.id),
    sourceId: text("source_id").notNull(),
    fingerprint: text("fingerprint").notNull(),
    data: text("data").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.editionId, t.sourceId] }),
    index("covered_stories").on(t.fingerprint),
  ],
);

export const feedback = sqliteTable(
  "feedback",
  {
    readerId: text("reader_id")
      .notNull()
      .references(() => readers.id),
    editionId: text("edition_id")
      .notNull()
      .references(() => editions.id),
    rating: text("rating", { enum: ["helpful", "unhelpful"] }).notNull(),
    comment: text("comment").notNull(),
  },
  (t) => [primaryKey({ columns: [t.readerId, t.editionId] })],
);

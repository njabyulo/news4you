import { readers } from "../reader";
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const generationRuns = sqliteTable(
  "generation_runs",
  {
    id: text("id").primaryKey(),
    readerId: text("reader_id")
      .notNull()
      .references(() => readers.id),
    localDate: text("local_date").notNull(),
    kind: text("kind", { enum: ["daily", "preview"] }).notNull(),
    status: text("status", {
      enum: ["pending", "running", "completed", "failed"],
    }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    dispatchRequestedAt: text("dispatch_requested_at"),
    leaseToken: text("lease_token"),
    leaseUntil: text("lease_until"),
    editionId: text("edition_id"),
    error: text("error"),
    progress: text("progress"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("one_daily_run")
      .on(t.readerId, t.localDate)
      .where(sql`${t.kind}='daily'`),
    uniqueIndex("one_active_preview")
      .on(t.readerId)
      .where(sql`${t.kind}='preview' AND ${t.status} IN ('pending','running')`),
    index("pending_runs").on(t.status, t.leaseUntil, t.createdAt),
  ],
);

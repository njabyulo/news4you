import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const readers = sqliteTable("readers", {
  id: text("id").primaryKey(),
  sourcesConfigured: integer("sources_configured", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const preferences = sqliteTable("preferences", {
  readerId: text("reader_id")
    .primaryKey()
    .references(() => readers.id),
  data: text("data").notNull(),
});

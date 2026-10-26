import { readers } from "../reader";
import { sqliteTable, text, primaryKey, index } from "drizzle-orm/sqlite-core";

export const sourceSettings = sqliteTable(
  "source_settings",
  {
    readerId: text("reader_id")
      .notNull()
      .references(() => readers.id),
    id: text("id").notNull(),
    data: text("data").notNull(),
  },
  (t) => [primaryKey({ columns: [t.readerId, t.id] })],
);

export const sourceItems = sqliteTable(
  "source_items",
  {
    id: text("id").primaryKey(),
    readerId: text("reader_id")
      .notNull()
      .references(() => readers.id),
    fingerprint: text("fingerprint").notNull(),
    data: text("data").notNull(),
    collectedAt: text("collected_at").notNull(),
  },
  (t) => [index("source_retention").on(t.collectedAt)],
);

import { readers } from "../reader";
import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";

export const googleConnections = sqliteTable("google_connections", {
  readerId: text("reader_id")
    .primaryKey()
    .references(() => readers.id),
  refreshToken: text("refresh_token").notNull(),
  settings: text("settings").notNull().default("{}"),
  connectedAt: text("connected_at").notNull(),
  lastSyncedAt: text("last_synced_at"),
});

export const googleOauthStates = sqliteTable(
  "google_oauth_states",
  {
    state: text("state").primaryKey(),
    readerId: text("reader_id")
      .notNull()
      .references(() => readers.id),
    verifier: text("verifier").notNull(),
    nonce: text("nonce").notNull(),
    expiresAt: text("expires_at").notNull(),
  },
  (t) => [index("google_oauth_expiry").on(t.expiresAt)],
);

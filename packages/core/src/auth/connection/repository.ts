import type { DatabaseClient } from "@news4you/database/client";
import { googleConnections, googleOauthStates, sourceItems } from "@news4you/database/schema";
import type { GoogleSettings } from "@news4you/shared";
import { and, eq, lt, inArray, sql } from "drizzle-orm";

export type ConnectionRepositoryPort = Pick<ConnectionRepository, keyof ConnectionRepository>;

export const createConnectionRepository = (db: DatabaseClient): ConnectionRepository =>
  new ConnectionRepository(db);

export class ConnectionRepository {
  constructor(private db: DatabaseClient) {}

  async getGoogleConnection(reader: string) {
    return this.db
      .select()
      .from(googleConnections)
      .where(eq(googleConnections.readerId, reader))
      .get();
  }
  async saveGoogleOAuthState(
    state: string,
    reader: string,
    encryptedVerifier: string,
    nonce: string,
    expiresAt: string,
  ) {
    await this.db.batch([
      this.db
        .delete(googleOauthStates)
        .where(lt(googleOauthStates.expiresAt, new Date().toISOString())),
      this.db
        .insert(googleOauthStates)
        .values({ state, readerId: reader, verifier: encryptedVerifier, nonce, expiresAt }),
    ]);
  }
  async consumeGoogleOAuthState(state: string) {
    const [row] = await this.db
      .delete(googleOauthStates)
      .where(eq(googleOauthStates.state, state))
      .returning();
    return row;
  }
  async saveGoogleSettings(reader: string, settings: GoogleSettings) {
    await this.db
      .update(googleConnections)
      .set({ settings: JSON.stringify(settings), lastSyncedAt: null })
      .where(eq(googleConnections.readerId, reader));
  }
  async deleteGoogleConnection(reader: string) {
    await this.db.batch([
      this.db.delete(googleConnections).where(eq(googleConnections.readerId, reader)),
      this.db.delete(googleOauthStates).where(eq(googleOauthStates.readerId, reader)),
      this.db
        .delete(sourceItems)
        .where(
          and(
            eq(sourceItems.readerId, reader),
            inArray(sql<string>`json_extract(${sourceItems.data}, '$.kind')`, [
              "calendar",
              "email",
            ]),
          ),
        ),
    ]);
  }
  async saveGoogleConnection(reader: string, encryptedRefreshToken: string) {
    const connectedAt = new Date().toISOString();
    await this.db
      .insert(googleConnections)
      .values({ readerId: reader, refreshToken: encryptedRefreshToken, connectedAt })
      .onConflictDoUpdate({
        target: googleConnections.readerId,
        set: { refreshToken: encryptedRefreshToken, connectedAt, lastSyncedAt: null },
      });
  }
  async recordGoogleSync(reader: string, timestamp: string) {
    await this.db
      .update(googleConnections)
      .set({ lastSyncedAt: timestamp })
      .where(eq(googleConnections.readerId, reader));
  }
}

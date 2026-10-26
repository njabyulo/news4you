import type { DatabaseClient } from "@news4you/database/client";
import { readers, preferences, sourceSettings } from "@news4you/database/schema";
import {
  defaults,
  defaultSources,
  preferencesSchema,
  sourceSchema,
  type Preferences,
  type Source,
} from "@news4you/shared";
import { eq } from "drizzle-orm";

export type ReaderRepositoryPort = Pick<ReaderRepository, keyof ReaderRepository>;

export const createReaderRepository = (db: DatabaseClient): ReaderRepository =>
  new ReaderRepository(db);

export class ReaderRepository {
  constructor(private db: DatabaseClient) {}

  async prefs(reader: string): Promise<Preferences> {
    const row = await this.db
      .select({ data: preferences.data })
      .from(preferences)
      .where(eq(preferences.readerId, reader))
      .get();
    return row ? preferencesSchema.parse(JSON.parse(row.data)) : defaults;
  }
  async sources(reader: string) {
    const rows = await this.db
      .select({ data: sourceSettings.data })
      .from(sourceSettings)
      .where(eq(sourceSettings.readerId, reader));
    if (rows.length) return rows.map((row) => sourceSchema.parse(JSON.parse(row.data)));
    const readerSettings = await this.db
      .select({ configured: readers.sourcesConfigured })
      .from(readers)
      .where(eq(readers.id, reader))
      .get();
    return readerSettings?.configured ? [] : defaultSources;
  }
  async savePreferences(reader: string, value: Preferences) {
    const data = JSON.stringify(value);
    await this.db
      .insert(preferences)
      .values({ readerId: reader, data })
      .onConflictDoUpdate({ target: preferences.readerId, set: { data } });
  }
  async saveSources(reader: string, list: Source[]) {
    await this.db.batch([
      this.db.delete(sourceSettings).where(eq(sourceSettings.readerId, reader)),
      this.db.update(readers).set({ sourcesConfigured: true }).where(eq(readers.id, reader)),
      ...(list.length
        ? [
            this.db.insert(sourceSettings).values(
              list.map((source) => ({
                readerId: reader,
                id: source.id,
                data: JSON.stringify(source),
              })),
            ),
          ]
        : []),
    ]);
  }
  async ensureReader(reader: string) {
    await this.db.insert(readers).values({ id: reader }).onConflictDoNothing();
  }
  async listReaders() {
    return this.db.select({ id: readers.id }).from(readers);
  }
}

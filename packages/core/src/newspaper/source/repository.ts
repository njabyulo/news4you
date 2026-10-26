import type { DatabaseClient } from "@news4you/database/client";
import { sourceItems } from "@news4you/database/schema";
import { lt } from "drizzle-orm";

export type SourceRepositoryPort = Pick<SourceRepository, keyof SourceRepository>;

export const createSourceRepository = (db: DatabaseClient): SourceRepository =>
  new SourceRepository(db);

export class SourceRepository {
  constructor(private db: DatabaseClient) {}

  async purgeSourceContentBefore(cutoff: string) {
    await this.db.delete(sourceItems).where(lt(sourceItems.collectedAt, cutoff));
  }
}

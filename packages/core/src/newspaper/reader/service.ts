import type { ReaderRepositoryPort } from "./repository";
import { preferencesSchema, sourceListSchema } from "@news4you/shared";

export const createReaderService = (repository: ReaderRepositoryPort) =>
  new ReaderService(repository);

export class ReaderService {
  constructor(private repository: ReaderRepositoryPort) {}
  ensure(reader: string) {
    return this.repository.ensureReader(reader);
  }
  preferences(reader: string) {
    return this.repository.prefs(reader);
  }
  sources(reader: string) {
    return this.repository.sources(reader);
  }
  async savePreferences(reader: string, input: unknown) {
    const value = preferencesSchema.parse(input);
    await this.repository.savePreferences(reader, value);
    return value;
  }
  async saveSources(reader: string, input: unknown) {
    const value = sourceListSchema.parse(input);
    await this.repository.saveSources(reader, value);
    return value;
  }
}

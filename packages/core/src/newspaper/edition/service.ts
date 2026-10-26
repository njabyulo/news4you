import type { GenerationRepositoryPort } from "../generation/repository";
import type { ReaderRepositoryPort } from "../reader/repository";
import { localDate } from "../util";
import type { EditionRepositoryPort } from "./repository";
import { validateReferences } from "./util";
import { feedbackSchema, publicationResultSchema } from "@news4you/shared";

export interface EditionServiceDependencies {
  repository: EditionRepositoryPort;
  generations: GenerationRepositoryPort;
  readers: ReaderRepositoryPort;
  now: () => Date;
}

export const createEditionService = (dependencies: EditionServiceDependencies) =>
  new EditionService(dependencies);

export class EditionService {
  constructor(private dependencies: EditionServiceDependencies) {}
  list(reader: string) {
    return this.dependencies.repository.listEditions(reader);
  }
  get(reader: string, id: string) {
    return this.dependencies.repository.getEdition(reader, id);
  }
  run(reader: string, id: string) {
    return this.dependencies.repository.getRun(reader, id);
  }
  async today(reader: string) {
    const { repository, readers, now } = this.dependencies;
    const preferences = await readers.prefs(reader);
    const date = localDate(now(), preferences.timezone);
    const found = await repository.findDailyGeneration(reader, date);
    const run = found ? await repository.getRun(reader, found.id) : null;
    const edition = await repository.findDailyEdition(reader, date);
    if (edition)
      return {
        state: "ready" as const,
        localDate: date,
        edition: await repository.getEdition(reader, edition.id),
        run,
      };
    return {
      state: run
        ? run.status === "failed"
          ? ("failed" as const)
          : ("generating" as const)
        : ("missing" as const),
      localDate: date,
      run,
    };
  }
  async feedback(reader: string, input: unknown) {
    const feedback = feedbackSchema.parse(input);
    if (!(await this.dependencies.repository.getEdition(reader, feedback.editionId))) return false;
    await this.dependencies.repository.saveFeedback(reader, feedback);
    return true;
  }
  async publish(id: string, input: unknown) {
    const data = publicationResultSchema.parse(input);
    const run = await this.dependencies.generations.findLeasedRun(id, data.leaseToken);
    if (!run) return { kind: "expired" as const };
    const preferences = await this.dependencies.readers.prefs(run.readerId);
    try {
      validateReferences(data.content, data.items, preferences.readingMinutes);
    } catch (error) {
      return { kind: "invalid" as const, message: (error as Error).message };
    }
    return {
      kind: "published" as const,
      editionId: await this.dependencies.repository.savePublishedEdition(
        run,
        data,
        preferences.readingMinutes,
      ),
    };
  }
}

import type { ReaderRepositoryPort } from "../reader/repository";
import type { SourceRepositoryPort } from "../source/repository";
import { localDate, isDue } from "../util";
import type { GenerationRepositoryPort } from "./repository";
import {
  generationSchema,
  progressUpdateSchema,
  runLeaseSchema,
  generationFailureSchema,
  type ClaimedRun,
} from "@news4you/shared";

export interface GenerationServiceDependencies {
  repository: GenerationRepositoryPort;
  readers: ReaderRepositoryPort;
  sources: SourceRepositoryPort;
  now: () => Date;
}

export const createGenerationService = (dependencies: GenerationServiceDependencies) =>
  new GenerationService(dependencies);

export class GenerationService {
  constructor(private dependencies: GenerationServiceDependencies) {}
  async request(reader: string, input: unknown) {
    const { kind } = generationSchema.parse(input);
    const { repository, readers, now } = this.dependencies;
    const preferences = await readers.prefs(reader);
    const run = await repository.enqueue(reader, localDate(now(), preferences.timezone), kind);
    if (run.status === "failed") {
      await repository.resetFailedRun(run.id);
      run.status = "pending";
    }
    return run;
  }
  async progress(id: string, input: unknown) {
    const { leaseToken, ...update } = progressUpdateSchema.parse(input);
    return this.dependencies.repository.saveProgress(id, leaseToken, {
      ...update,
      updatedAt: this.dependencies.now().toISOString(),
    });
  }
  claimDispatch(id: string) {
    return this.dependencies.repository.claimDispatch(id);
  }
  async schedule() {
    const { repository, readers, sources, now: clock } = this.dependencies;
    const now = clock();
    let due = 0;
    for (const reader of await readers.listReaders()) {
      const preferences = await readers.prefs(reader.id);
      if (isDue(now, preferences)) {
        await repository.enqueue(reader.id, localDate(now, preferences.timezone), "daily");
        due++;
      }
    }
    await sources.purgeSourceContentBefore(new Date(now.getTime() - 7 * 86400000).toISOString());
    return due;
  }
  pending() {
    return this.dependencies.repository.hasPendingRuns();
  }
  pendingRunIds() {
    return this.dependencies.repository.pendingRunIds();
  }
  async claim(id?: string): Promise<ClaimedRun | null> {
    const { repository, readers } = this.dependencies;
    const run = await repository.claimRun(id);
    return run
      ? {
          id: run.id,
          localDate: run.localDate,
          kind: run.kind,
          leaseToken: run.leaseToken!,
          preferences: await readers.prefs(run.readerId),
          sources: await readers.sources(run.readerId),
          covered: await repository.coveredFingerprints(run.readerId),
        }
      : null;
  }
  async personalContext(id: string, input: unknown) {
    const { leaseToken } = runLeaseSchema.parse(input);
    const run = await this.dependencies.repository.findLeasedRun(id, leaseToken);
    return run
      ? {
          readerId: run.readerId,
          localDate: run.localDate,
          preferences: await this.dependencies.readers.prefs(run.readerId),
        }
      : null;
  }
  fail(id: string, input: unknown) {
    return this.dependencies.repository.failRun(id, generationFailureSchema.parse(input));
  }
}

import {
  createReaderService,
  createGenerationService,
  createEditionService,
  type ReaderRepositoryPort,
  type GenerationRepositoryPort,
  type EditionRepositoryPort,
} from "@news4you/core";
import { defaults, defaultSources } from "@news4you/shared";
import { describe, expect, it, vi } from "vitest";

function generationRepository() {
  return {
    enqueue: vi.fn<GenerationRepositoryPort["enqueue"]>(),
    hasPendingRuns: vi.fn<GenerationRepositoryPort["hasPendingRuns"]>(),
    pendingRunIds: vi.fn<GenerationRepositoryPort["pendingRunIds"]>(),
    claimRun: vi.fn<GenerationRepositoryPort["claimRun"]>(),
    findLeasedRun: vi.fn<GenerationRepositoryPort["findLeasedRun"]>(),
    failRun: vi.fn<GenerationRepositoryPort["failRun"]>(),
    resetFailedRun: vi.fn<GenerationRepositoryPort["resetFailedRun"]>(),
    saveProgress: vi.fn<GenerationRepositoryPort["saveProgress"]>(),
    claimDispatch: vi.fn<GenerationRepositoryPort["claimDispatch"]>(),
    coveredFingerprints: vi.fn<GenerationRepositoryPort["coveredFingerprints"]>(),
  } satisfies GenerationRepositoryPort;
}

function readerRepository() {
  return {
    ensureReader: vi.fn<ReaderRepositoryPort["ensureReader"]>(),
    prefs: vi.fn<ReaderRepositoryPort["prefs"]>().mockResolvedValue(defaults),
    sources: vi.fn<ReaderRepositoryPort["sources"]>().mockResolvedValue(defaultSources),
    savePreferences: vi.fn<ReaderRepositoryPort["savePreferences"]>().mockResolvedValue(),
    saveSources: vi.fn<ReaderRepositoryPort["saveSources"]>().mockResolvedValue(),
    listReaders: vi.fn<ReaderRepositoryPort["listReaders"]>(),
  } satisfies ReaderRepositoryPort;
}

describe("constructor-injected service policies without a database", () => {
  it("validates and normalizes reader preferences before calling the repository", async () => {
    const repository = readerRepository();
    const service = createReaderService(repository);
    const preferences = await service.savePreferences("reader-a", { readingMinutes: 10 });
    expect(preferences).toEqual({ ...defaults, readingMinutes: 10 });
    expect(repository.savePreferences).toHaveBeenCalledWith("reader-a", preferences);
  });
  it("rejects duplicate sources before any repository write", async () => {
    const repository = readerRepository();
    await expect(
      createReaderService(repository).saveSources("reader-a", [
        defaultSources[0],
        defaultSources[0],
      ]),
    ).rejects.toThrow("Duplicate source id");
    expect(repository.saveSources).not.toHaveBeenCalled();
  });
  it("uses the injected clock and reader timezone when requesting an edition", async () => {
    const readers = readerRepository(),
      repository = generationRepository();
    const timestamp = "2026-10-24T23:30:00.000Z";
    repository.enqueue.mockResolvedValue({
      id: "fixture-run",
      readerId: "reader-a",
      localDate: "2026-10-25",
      kind: "daily",
      status: "pending",
      attempts: 0,
      dispatchRequestedAt: null,
      progress: null,
      leaseToken: null,
      leaseUntil: null,
      editionId: null,
      error: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const service = createGenerationService({
      repository,
      readers,
      sources: { purgeSourceContentBefore: vi.fn() },
      now: () => new Date(timestamp),
    });
    await service.request("reader-a", { kind: "daily" });
    expect(repository.enqueue).toHaveBeenCalledWith("reader-a", "2026-10-25", "daily");
  });
  it("enforces edition ownership before storing feedback", async () => {
    const repository = {
      getEdition: vi.fn<EditionRepositoryPort["getEdition"]>().mockResolvedValue(null),
      listEditions: vi.fn<EditionRepositoryPort["listEditions"]>(),
      getRun: vi.fn<EditionRepositoryPort["getRun"]>(),
      savePublishedEdition: vi.fn<EditionRepositoryPort["savePublishedEdition"]>(),
      findDailyEdition: vi.fn<EditionRepositoryPort["findDailyEdition"]>(),
      findDailyGeneration: vi.fn<EditionRepositoryPort["findDailyGeneration"]>(),
      saveFeedback: vi.fn<EditionRepositoryPort["saveFeedback"]>(),
    } satisfies EditionRepositoryPort;
    const service = createEditionService({
      repository,
      readers: readerRepository(),
      generations: generationRepository(),
      now: () => new Date("2026-10-25T00:00:00Z"),
    });
    expect(
      await service.feedback("reader-a", {
        editionId: "9f231125-c6c3-4818-8096-b75db2db4517",
        rating: "helpful",
      }),
    ).toBe(false);
    expect(repository.getEdition).toHaveBeenCalledWith(
      "reader-a",
      "9f231125-c6c3-4818-8096-b75db2db4517",
    );
    expect(repository.saveFeedback).not.toHaveBeenCalled();
  });
});

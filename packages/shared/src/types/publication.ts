import { agendaSchema, editionContentSchema, type EditionContent } from "./edition";
import type { ClaimedRun, DraftObserver, ProgressUpdate } from "./generation";
import type { Preferences } from "./reader";
import { sourceItemSchema, type SourceItem, type Source } from "./source";
import { z } from "zod";

export interface EditionEditor {
  edit(
    items: SourceItem[],
    preferences: Preferences,
    editionDate: string,
    onDraft?: DraftObserver,
  ): Promise<EditionContent>;
}

export interface PublicationLogger {
  info(...values: (string | number)[]): void;
  error(...values: string[]): void;
}

/** Queue operations needed by publication, independent of HTTP or D1. */
export interface PublicationQueue {
  schedule(): Promise<void>;
  claim(id?: string): Promise<ClaimedRun | null>;
  progress(run: ClaimedRun, update: Omit<ProgressUpdate, "leaseToken">): Promise<void>;
  personal(run: ClaimedRun): Promise<{ items: SourceItem[] }>;
  publish(run: ClaimedRun, result: PublicationResult): Promise<void>;
  fail(run: ClaimedRun, message: string): Promise<void>;
}

export type PublicationResult = z.infer<typeof publicationResultSchema>;

export interface PublicSourceCollector {
  collect(sources: Source[], preferences: Preferences): Promise<SourceItem[]>;
}

export const publicationResultSchema = z.object({
  leaseToken: z.string().uuid(),
  content: editionContentSchema,
  agenda: agendaSchema.default([]),
  emails: agendaSchema.max(8).default([]),
  items: z.array(sourceItemSchema).min(1).max(25),
});

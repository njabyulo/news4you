import type { SourceServicePort } from "../source/service";
import { rankItems } from "../source/util";
import type {
  EditionEditor,
  DraftContent,
  TokenUsage,
  GenerationProgress,
  PublicationLogger,
  PublicationQueue,
  PublicSourceCollector,
} from "@news4you/shared";

export interface PublicationDependencies {
  queue: PublicationQueue;
  editor: EditionEditor;
  sources: PublicSourceCollector;
  now: () => Date;
  logger: PublicationLogger;
  sourceService: SourceServicePort;
}

export const createPublicationService = (dependencies: PublicationDependencies) =>
  new PublicationService(dependencies);

const INVOCATION_BUDGET_MS = 12 * 60000;

const MAX_EDITOR_CALLS = 5;

/** Owns publication order and stopping rules, independent of transport. */
export class PublicationService {
  constructor(private dependencies: PublicationDependencies) {}
  async run(
    options: { runId?: string; scheduled?: boolean; maxRuns?: number } = {},
  ): Promise<{ calls: number; failed: boolean }> {
    const { queue, editor, sources, now, logger, sourceService } = this.dependencies;
    if (options.scheduled !== false) await queue.schedule();
    let calls = 0;
    const deadline = now().getTime() + INVOCATION_BUDGET_MS;
    while (
      calls < Math.min(MAX_EDITOR_CALLS, options.maxRuns ?? MAX_EDITOR_CALLS) &&
      now().getTime() < deadline
    ) {
      const run = await queue.claim(options.runId);
      if (!run) break;
      let sequence = 0;
      let draft: DraftContent | undefined;
      let usage: TokenUsage | undefined;
      let references: GenerationProgress["references"] = [];
      const report = (stage: GenerationProgress["stage"]) =>
        queue.progress(run, {
          sequence: ++sequence,
          stage,
          draft,
          usage,
          references,
        });
      try {
        await report("collecting");
        const { personal, collected } = await sourceService.collect(
          queue.personal(run),
          sources.collect(run.sources, run.preferences),
        );
        // Personal items are displayed verbatim in separate snapshots. This
        // filter is enforced here even if an upstream collector mixes kinds.
        const items = rankItems(
          collected.filter((item) => item.kind === "rss" || item.kind === "weather"),
          run.preferences.interests,
          new Set(run.covered),
          now(),
        );
        if (!items.length) throw new Error("No fresh source items");
        logger.info("Editing run", run.id, "using", items.length, "source items");
        references = items.map(({ id, title, url, publishedAt, fingerprint }) => ({
          id,
          title,
          url,
          publishedAt,
          fingerprint,
        }));
        await report("writing");
        calls++;
        const content = await editor.edit(
          items,
          run.preferences,
          run.localDate,
          async (nextDraft, nextUsage, stage = "writing") => {
            draft = nextDraft;
            usage = nextUsage;
            await report(stage);
          },
        );
        draft = content;
        await report("saving");
        await queue.publish(run, {
          leaseToken: run.leaseToken,
          content,
          agenda: personal
            .filter((item) => item.kind === "calendar")
            .map((item) => ({
              title: item.title,
              detail: item.content,
              url: item.url,
            })),
          emails: personal
            .filter((item) => item.kind === "email")
            .slice(0, 8)
            .map((item) => ({
              title: item.title,
              detail: item.content.slice(0, 1500),
              url: item.url,
            })),
          items,
        });
        logger.info("Published run", run.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Publication failed";
        await queue.fail(run, message);
        logger.error("Publication stopped:", message);
        return { calls, failed: true };
      }
    }
    return { calls, failed: false };
  }
}

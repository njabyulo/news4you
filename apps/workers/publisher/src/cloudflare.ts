import { createHostedEditor } from "./adapters/ai/agents";
import { createMastraEditionEditor } from "./adapters/ai/editor";
import { createWorkflowEditionEditor } from "./adapters/ai/workflow-editor";
import { createPublisherApi } from "./adapters/http/publisher-api";
import { createCloudflareSources } from "./adapters/sources/cloudflare";
import { schedulePublications } from "./handlers/schedule";
import { createPublicationService, createSourceService } from "@news4you/core";
import { createEditorService } from "@news4you/core/editor";
import { WorkflowEntrypoint, type WorkflowStep, type WorkflowEvent } from "cloudflare:workers";

export interface HostedPublisherEnv {
  API_URL: string;
  API: Fetcher;
  PUBLISHER_TOKEN: string;
  GOOGLE_GENERATIVE_AI_API_KEY: string;
  MODEL_FREE_TIER_CONFIRMED: string;
  PUBLICATION: Workflow<{ runId: string }>;
}

export default {
  fetch() {
    return Response.json({ service: "news4you-publisher", runtime: "cloudflare-workflows" });
  },
  async scheduled(_controller: ScheduledController, env: HostedPublisherEnv) {
    await schedulePublications(env);
  },
};

export class PublicationWorkflow extends WorkflowEntrypoint<HostedPublisherEnv, { runId: string }> {
  async run(event: WorkflowEvent<{ runId: string }>, step: WorkflowStep) {
    // Disable step retries: model quota failures must never cause hidden repeated calls.
    return step.do(
      "publish edition",
      { retries: { limit: 0, delay: "1 second" }, timeout: "6 minutes" },
      async () => {
        const queue = createPublisherApi({
          baseUrl: this.env.API_URL,
          token: this.env.PUBLISHER_TOKEN,
          fetch: this.env.API.fetch.bind(this.env.API) as typeof fetch,
        });
        const editor = createMastraEditionEditor({
          hosted: createHostedEditor(this.env.GOOGLE_GENERATIVE_AI_API_KEY),
          policy: createEditorService(() => this.env),
          now: () => new Date(),
        });
        const result = await createPublicationService({
          queue,
          editor: createWorkflowEditionEditor(editor),
          sources: createCloudflareSources(),
          sourceService: createSourceService(),
          now: () => new Date(),
          logger: { info: console.log, error: console.error },
        }).run({ runId: event.payload.runId, scheduled: false, maxRuns: 1 });
        if (result.failed) throw new Error("Publication failed; see the generation status");
        return result;
      },
    );
  }
}

import { workflowEditor } from "../../adapters/ai";
import { createPublisherApi } from "../../adapters/http/publisher-api";
import { collect } from "../../adapters/sources/public";
import type { PublisherConfig } from "../../config/env";
import { createPublicationService, createSourceService } from "@news4you/core";

export function createPublicationHandler({ baseUrl, token }: PublisherConfig) {
  return async () => {
    return createPublicationService({
      sourceService: createSourceService(),
      queue: createPublisherApi({ baseUrl, token }),
      editor: workflowEditor,
      sources: { collect },
      now: () => new Date(),
      logger: { info: console.log, error: console.error },
    }).run();
  };
}

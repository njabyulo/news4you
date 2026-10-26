import { readPublisherConfig, type PublisherConfig } from "./config/env";
import { createPublicationHandler } from "./handlers/publication";

export function createPublisher(config: PublisherConfig = readPublisherConfig()) {
  return { run: createPublicationHandler(config) };
}

import { instructions } from "./instructions";
import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";

export const editor = new Agent({
  id: "news4you-editor",
  name: "News4You editor",
  model: "google/gemma-4-26b-a4b-it",
  instructions,
});

export function createHostedEditor(apiKey: string) {
  const agent = new Agent({
    id: "news4you-hosted-editor",
    name: "News4You public-news editor",
    instructions,
    model: { id: "google/gemma-4-26b-a4b-it", apiKey },
  });
  // Disable SDK request logging; operational logs contain run IDs and safe errors only.
  const mastra = new Mastra({ agents: { editor: agent }, logger: false });
  return mastra.getAgent("editor");
}

import { editor } from "./agents";
import { createMastraEditionEditor } from "./editor";
import { createPublicationWorkflow } from "./workflow";
import { createWorkflowEditionEditor } from "./workflow-editor";
import { Mastra } from "@mastra/core/mastra";
import { createEditorService } from "@news4you/core/editor";

export const editionEditor = createMastraEditionEditor({
  hosted: editor,
  policy: createEditorService(() => process.env),
  now: () => new Date(),
});

export const publicationWorkflow = createPublicationWorkflow(editionEditor);

export const mastra = new Mastra({
  agents: { editor },
  workflows: { publicationWorkflow },
  logger: false,
});

export const workflowEditor = createWorkflowEditionEditor(editionEditor);

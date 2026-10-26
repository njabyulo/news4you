import { createPublicationWorkflow } from "./workflow";
import type { DraftObserver, EditionEditor, SourceItem, Preferences } from "@news4you/shared";

export const createWorkflowEditionEditor = (
  editor: EditionEditor,
  workflowFactory = createPublicationWorkflow,
) => new WorkflowEditionEditor(editor, workflowFactory);

/** Each invocation owns its observer; concurrent runs cannot share private drafts. */
export class WorkflowEditionEditor implements EditionEditor {
  constructor(
    private readonly editor: EditionEditor,
    private readonly workflowFactory: typeof createPublicationWorkflow,
  ) {}

  async edit(
    items: SourceItem[],
    preferences: Preferences,
    editionDate?: string,
    onDraft?: DraftObserver,
  ) {
    const workflow = this.workflowFactory({
      edit: (sources, prefs, date) => this.editor.edit(sources, prefs, date, onDraft),
    });
    const run = await workflow.createRun();
    const result = await run.start({ inputData: { items, preferences, editionDate } });
    if (result.status !== "success")
      throw new Error(
        result.status === "failed" ? result.error.message : "Editorial workflow did not complete",
      );
    return result.result;
  }
}

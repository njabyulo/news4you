import { createStep, createWorkflow } from "@mastra/core/workflows";
import { localDate } from "@news4you/core";
import {
  editionContentSchema,
  sourceItemSchema,
  preferencesSchema,
  type EditionEditor,
} from "@news4you/shared";
import { z } from "zod";

const inputSchema = z.object({
  items: z.array(sourceItemSchema),
  preferences: preferencesSchema,
  editionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const createPublicationWorkflow = (editor: EditionEditor, now = () => new Date()) => {
  const editorialStep = createStep({
    id: "edit-and-validate",
    inputSchema,
    outputSchema: editionContentSchema,
    execute: async ({ inputData }) =>
      editor.edit(
        inputData.items,
        inputData.preferences,
        inputData.editionDate ?? localDate(now(), inputData.preferences.timezone),
      ),
  });

  return createWorkflow({
    id: "publication",
    inputSchema,
    outputSchema: editionContentSchema,
  })
    .then(editorialStep)
    .commit();
};

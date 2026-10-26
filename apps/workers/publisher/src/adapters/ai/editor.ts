import { parseDraft } from "./draft";
import type { Agent } from "@mastra/core/agent";
import { localDate, validateReferences } from "@news4you/core";
import type { EditorService } from "@news4you/core/editor";
import {
  editionContentSchema,
  type DraftObserver,
  type EditionEditor,
  type SourceItem,
  type Preferences,
} from "@news4you/shared";

export interface MastraEditionEditorDependencies {
  hosted: Pick<Agent, "stream">;
  policy: Pick<EditorService, "resolve">;
  now: () => Date;
}

export const createMastraEditionEditor = (dependencies: MastraEditionEditorDependencies) =>
  new MastraEditionEditor(dependencies);

export class MastraEditionEditor implements EditionEditor {
  constructor(private readonly dependencies: MastraEditionEditorDependencies) {}

  async edit(
    items: SourceItem[],
    preferences: Preferences,
    editionDate = localDate(this.dependencies.now(), preferences.timezone),
    onDraft?: DraftObserver,
  ) {
    const personal = items.some((item) => item.kind === "email" || item.kind === "calendar");
    if (personal) throw new Error("Personal sources must never be sent to the AI editor");
    const policy = this.dependencies.policy.resolve(false);

    const prompt = JSON.stringify({
      task: "Prepare today’s edition as JSON",
      editionDate,
      timezone: preferences.timezone,
      maxWords: preferences.readingMinutes * 180,
      interests: preferences.interests,
      untrustedSources: items.map((x) => ({
        ...x,
        content: x.content.slice(0, 1500),
      })),
    });
    if (prompt.length > 65000) throw new Error("Model input limit exceeded");
    const selectedEditor = this.dependencies.hosted;
    let output = "";
    let lastCheckpoint = 0;
    let finishReason: string | undefined;
    try {
      const stream = await selectedEditor.stream(prompt, {
        maxSteps: 1,
        providerOptions: { google: { thinkingConfig: { thinkingLevel: "minimal" } } },
        modelSettings: {
          maxRetries: 0,
          maxOutputTokens: Math.min(5000, preferences.readingMinutes * 500),
        },
        abortSignal: AbortSignal.timeout(policy.timeoutMs),
      });
      for await (const chunk of stream.textStream) {
        output += chunk;
        if (output.length > 100000) throw new Error("Model output limit exceeded");
        const now = Date.now();
        if (onDraft && now - lastCheckpoint >= 750) {
          const draft = parseDraft(output);
          if (draft) {
            await onDraft(draft);
            lastCheckpoint = now;
          }
        }
      }
      if (stream.error) throw stream.error;
      finishReason = await stream.finishReason;
      if (finishReason !== "stop") throw new Error("Incomplete model output");
      const usage = await stream.usage;
      const draft = parseDraft(output);
      if (onDraft && draft)
        await onDraft(
          draft,
          {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
          },
          "validating",
        );
    } catch (error) {
      const status =
        error && typeof error === "object" && "statusCode" in error ? error.statusCode : undefined;
      if (status === 402)
        throw new Error(
          "Gemma is unavailable: the operator must return the Google project to Free tier. No paid fallback was used.",
        );
      if (status === 429)
        throw new Error(
          "Gemma free-tier quota is exhausted. Try again after the quota resets. No paid fallback was used.",
        );
      throw new Error("Model generation failed. Please try again.");
    }
    if (!output.trim()) throw new Error("Empty model output");
    const text = output
      .trim()
      .replace(/^```(?:json)?\s*/, "")
      .replace(/\s*```$/, "");
    const content = editionContentSchema.parse(JSON.parse(text));
    validateReferences(content, items, preferences.readingMinutes);
    return content;
  }
}

import { draftContentSchema, type DraftContent } from "@news4you/shared";
import { parse, Allow } from "partial-json";

/** Only expose the edition shape; never render partial JSON or model reasoning. */
export function parseDraft(text: string): DraftContent | undefined {
  try {
    const value = parse(
      text
        .trim()
        .replace(/^```(?:json)?\s*/, "")
        .replace(/\s*```$/, ""),
      Allow.STR | Allow.OBJ | Allow.ARR,
    );
    const result = draftContentSchema.safeParse(value);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

import type { Edition, SourceItem } from "@news4you/shared";

export function validateReferences(
  content: Edition["content"],
  items: SourceItem[],
  minutes: number,
) {
  const ids = new Set(items.map((x) => x.id));
  for (const s of content.sections)
    for (const story of s.stories)
      for (const id of story.sourceIds)
        if (!ids.has(id)) throw new Error("Unknown source identifier");
  const words = JSON.stringify(content).split(/\s+/).length;
  if (words > minutes * 220) throw new Error("Reading budget exceeded");
}

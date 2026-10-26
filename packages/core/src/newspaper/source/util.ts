import type { SourceItem } from "@news4you/shared";

export function fingerprint(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function rankItems(
  items: SourceItem[],
  interests: string[],
  covered: Set<string>,
  now: Date,
): SourceItem[] {
  const seen = new Set(covered);
  const seenIds = new Set<string>();
  const ranked = items
    .filter((i) => {
      if (seen.has(i.fingerprint) || seenIds.has(i.id)) return false;
      seen.add(i.fingerprint);
      seenIds.add(i.id);
      return true;
    })
    .map((i) => ({
      i,
      score:
        interests.reduce(
          (s, t) =>
            s + ((i.title + " " + i.content).toLowerCase().includes(t.toLowerCase()) ? 4 : 0),
          0,
        ) + Math.max(0, 2 - (now.getTime() - Date.parse(i.publishedAt)) / 86400000),
    }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.i);
  const personal = [
    ...ranked.filter((i) => i.kind === "weather").slice(0, 1),
    ...ranked.filter((i) => i.kind === "calendar" || i.kind === "email").slice(0, 8),
  ];
  return [...ranked.filter((i) => i.kind === "rss").slice(0, 12 - personal.length), ...personal];
}

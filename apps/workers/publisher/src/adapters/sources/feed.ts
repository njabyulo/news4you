import { fingerprint } from "@news4you/core";
import type { Source, SourceItem } from "@news4you/shared";
import { XMLParser } from "fast-xml-parser";
import { createHash } from "node:crypto";

const strip = (v: unknown) =>
  String(v ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function parseFeed(xml: string, _source: Source, now = new Date()): SourceItem[] {
  const parsed = new XMLParser({
    ignoreAttributes: false,
    processEntities: false,
  }).parse(xml);
  const raw = parsed.rss?.channel?.item ?? parsed.feed?.entry ?? [];
  return (Array.isArray(raw) ? raw : [raw]).slice(0, 30).flatMap((x: any) => {
    const title = strip(x.title?.["#text"] ?? x.title).slice(0, 300);
    const link = Array.isArray(x.link)
      ? x.link.find((l: any) => l["@_rel"] === "alternate")?.["@_href"]
      : typeof x.link === "string"
        ? x.link
        : x.link?.["@_href"];
    let url: URL;
    try {
      url = new URL(link);
      if (!["https:", "http:"].includes(url.protocol) || !title) return [];
    } catch {
      return [];
    }
    const date = new Date(x.pubDate ?? x.published ?? x.updated ?? now);
    if (
      !Number.isFinite(date.getTime()) ||
      date.getTime() > now.getTime() + 3600000 ||
      date.getTime() < now.getTime() - 7 * 86400000
    )
      return [];
    return [
      {
        id: createHash("sha256").update(url.href).digest("hex").slice(0, 24),
        title,
        url: url.href,
        publishedAt: date.toISOString(),
        fingerprint: fingerprint(title),
        content: strip(x.description ?? x.summary ?? x.content).slice(0, 5000),
        kind: "rss" as const,
      },
    ];
  });
}

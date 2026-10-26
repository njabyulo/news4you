import { defaults, type ClaimedRun, type EditionContent, type SourceItem } from "@news4you/shared";

export const now = new Date("2026-10-25T06:00:00Z");

export const run: ClaimedRun = {
  id: "9f231125-c6c3-4818-8096-b75db2db4517",
  leaseToken: "00000000-0000-4000-8000-000000000002",
  kind: "daily",
  localDate: "2026-10-25",
  preferences: defaults,
  sources: [],
  covered: [],
};

export const item: SourceItem = {
  id: "news",
  title: "Science news",
  url: "https://example.com/news",
  content: "Public science update",
  kind: "rss",
  fingerprint: "science news",
  publishedAt: now.toISOString(),
};

export const content: EditionContent = {
  headline: "Today's news",
  intro: "A short briefing",
  sections: [
    {
      title: "Science",
      stories: [
        {
          title: "Science news",
          body: "Public science update",
          sourceIds: [item.id],
        },
      ],
    },
  ],
};

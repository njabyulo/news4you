import { localDate, isDue, rankItems, validateReferences, fingerprint } from "../src/index";
import { defaults, preferencesSchema } from "@news4you/shared";
import type { SourceItem } from "@news4you/shared";
import { describe, it, expect } from "vitest";

const item = (title: string, date = "2026-10-24T05:00:00.000Z"): SourceItem => ({
  id: title,
  title,
  content: title,
  url: "https://example.com/story",
  publishedAt: date,
  fingerprint: fingerprint(title),
  kind: "rss",
});

describe("reader-local scheduling", () => {
  it("uses the reader date across the UTC boundary", () =>
    expect(localDate(new Date("2026-10-23T23:00:00Z"), defaults.timezone)).toBe("2026-10-24"));
  it("only schedules after the delivery time", () => {
    expect(isDue(new Date("2026-10-24T03:59:00Z"), defaults)).toBe(false);
    expect(isDue(new Date("2026-10-24T04:00:00Z"), defaults)).toBe(true);
    expect(
      isDue(new Date("2026-10-24T04:00:00Z"), {
        ...defaults,
        scheduled: false,
      }),
    ).toBe(false);
  });
  it("rejects invalid timezones and times", () => {
    expect(preferencesSchema.safeParse({ ...defaults, timezone: "Moon/Sea" }).success).toBe(false);
    expect(preferencesSchema.safeParse({ ...defaults, deliveryTime: "25:00" }).success).toBe(false);
  });
});

describe("editorial boundaries", () => {
  it("deduplicates titles and excludes published history", () => {
    const items = [
      item("Science discovery"),
      item("SCIENCE discovery!"),
      item("Old story"),
      item("Weather"),
    ];
    const result = rankItems(
      items,
      ["science"],
      new Set(["old story"]),
      new Date("2026-10-24T06:00:00Z"),
    );
    expect(result.map((x) => x.title)).toEqual(["Science discovery", "Weather"]);
  });
  it("rejects fabricated citations and over-budget output", () => {
    const content = {
      headline: "Today",
      intro: "Hi",
      sections: [
        {
          title: "News",
          stories: [{ title: "A", body: "Test", sourceIds: ["fake"] }],
        },
      ],
    };
    expect(() => validateReferences(content, [item("real")], 5)).toThrow("Unknown");
    content.sections[0].stories[0].sourceIds = ["real"];
    content.sections[0].stories[0].body = "long ".repeat(500);
    expect(() => validateReferences(content, [item("real")], 2)).toThrow("budget");
  });
});

it("reserves space for local weather and personal data", () => {
  const news = Array.from({ length: 20 }, (_, i) => item("Science " + i));
  const weather = { ...item("Local forecast"), kind: "weather" as const };
  const selected = rankItems(
    [...news, weather],
    ["Science"],
    new Set(),
    new Date("2026-10-24T06:00:00Z"),
  );
  expect(selected).toHaveLength(12);
  expect(selected.some((x) => x.kind === "weather")).toBe(true);
});

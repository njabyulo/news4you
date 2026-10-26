import { parseFeed, publicUrl, collect } from "../src/adapters/sources/public";
import { fingerprint } from "@news4you/core";
import { defaults, type SourceItem } from "@news4you/shared";
import { describe, it, expect } from "vitest";

const item = (title: string): SourceItem => ({
  id: title,
  title,
  content: title,
  url: "https://example.com/story",
  publishedAt: "2026-10-24T05:00:00.000Z",
  fingerprint: fingerprint(title),
  kind: "rss",
});

describe("public source boundaries", () => {
  it("strips HTML and drops unsafe source links and stale items", () => {
    const xml =
      "<rss><channel><item><title>Science today</title><link>https://example.com/story</link><description>&lt;b&gt;A fact&lt;/b&gt;</description><pubDate>Sat, 24 Oct 2026 05:00:00 GMT</pubDate></item><item><title>Unsafe</title><link>javascript:alert(1)</link></item></channel></rss>";
    const result = parseFeed(
      xml,
      {
        id: "test",
        name: "Test",
        url: "https://example.com/rss",
        enabled: true,
      },
      new Date("2026-10-24T06:00:00Z"),
    );
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Science today");
  });
  it("rejects local and private source requests", async () => {
    await expect(publicUrl("https://127.0.0.1/feed")).rejects.toThrow();
    await expect(publicUrl("http://example.com")).rejects.toThrow();
    await expect(publicUrl("https://[::1]/feed")).rejects.toThrow();
  });
});

describe("source failure isolation", () => {
  it("continues with available sources without inserting fictional personal data", async () => {
    const adapters = {
      rss: async () => [item("Science today")],
      weather: async () => {
        throw new Error("Weather offline");
      },
    };
    const result = await collect(
      [
        {
          id: "fixture",
          name: "Fixture",
          url: "https://example.com/rss",
          enabled: true,
        },
      ],
      defaults,
      adapters,
    );
    expect(result.some((x) => x.title === "Science today")).toBe(true);
    expect(result.filter((x) => x.kind === "email" || x.kind === "calendar")).toEqual([]);
  });
  it("refuses to substitute fictional personal data when all live sources fail", async () => {
    const adapters = {
      rss: async () => {
        throw new Error("RSS offline");
      },
      weather: async () => {
        throw new Error("Weather offline");
      },
    };
    await expect(collect([], defaults, adapters)).rejects.toThrow("All live sources");
  });
});

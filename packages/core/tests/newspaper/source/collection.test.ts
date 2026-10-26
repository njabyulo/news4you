import { createSourceService } from "@news4you/core";
import type { SourceItem } from "@news4you/shared";
import { afterEach, describe, it, expect, vi } from "vitest";

const sourceService = createSourceService();

const collectEditionSources = sourceService.collect.bind(sourceService);

const meeting: SourceItem = {
  id: "meeting",
  title: "Design review",
  kind: "calendar",
  content: "10:00 today",
  url: "https://calendar.google.com/",
  publishedAt: "2026-10-24T04:00:00Z",
  fingerprint: "meeting-today",
};

const news: SourceItem = {
  ...meeting,
  id: "news",
  title: "Public news",
  kind: "rss",
  fingerprint: "news",
};

afterEach(() => vi.restoreAllMocks());

describe("edition source availability", () => {
  it("publishes personal sources when every public source is unavailable", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await collectEditionSources(
      Promise.resolve({ items: [meeting] }),
      Promise.reject(new Error("All feeds offline")),
    );
    expect(result.personal).toEqual([meeting]);
    expect(result.collected).toEqual([meeting]);
  });
  it("stops rather than silently omitting Google sources when consent fails", async () => {
    await expect(
      collectEditionSources(Promise.reject(new Error("Reconnect Google")), Promise.resolve([news])),
    ).rejects.toThrow("Reconnect Google");
  });
  it("stops when there is no available content", async () => {
    await expect(
      collectEditionSources(
        Promise.resolve({ items: [] }),
        Promise.reject(new Error("All feeds offline")),
      ),
    ).rejects.toThrow("All feeds offline");
  });
  it("supports public-only editions and combines all sources when connected", async () => {
    expect(
      (await collectEditionSources(Promise.resolve({ items: [] }), Promise.resolve([news])))
        .collected,
    ).toEqual([news]);
    expect(
      (await collectEditionSources(Promise.resolve({ items: [meeting] }), Promise.resolve([news])))
        .collected,
    ).toEqual([meeting, news]);
  });
});

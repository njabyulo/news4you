import { parseDraft } from "../src/adapters/ai/draft";
import { createMastraEditionEditor } from "../src/adapters/ai/editor";
import { defaults } from "@news4you/shared";
import { describe, expect, it, vi } from "vitest";

const item = {
  id: "source",
  title: "A source",
  url: "https://example.com",
  content: "A factual update",
  kind: "rss" as const,
  publishedAt: new Date().toISOString(),
  fingerprint: "a-source",
};

const content = {
  headline: "A new day",
  intro: "A briefing",
  sections: [
    {
      title: "News",
      stories: [{ title: "An update", body: "A factual update", sourceIds: ["source"] }],
    },
  ],
};

describe("partial edition JSON", () => {
  it("renders unfinished strings and nested stories without exposing JSON syntax", () => {
    expect(parseDraft('{"headline":"A new')).toEqual({ headline: "A new" });
    expect(
      parseDraft(
        '{"headline":"A new day","sections":[{"title":"News","stories":[{"body":"An unfinished',
      ),
    ).toEqual({
      headline: "A new day",
      sections: [{ title: "News", stories: [{ body: "An unfinished" }] }],
    });
    expect(parseDraft('```json\n{"headline":"A new')).toEqual({ headline: "A new" });
    expect(parseDraft('{"headline":"A quote: \\"yes\\"')).toEqual({ headline: 'A quote: "yes"' });
    expect(parseDraft("not JSON")).toBeUndefined();
    expect(parseDraft('{"headline":false}')).toBeUndefined();
  });
  it("emits a growing draft before the model finishes, then validates the final response", async () => {
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const stream = vi.fn().mockResolvedValue({
      textStream: (async function* () {
        yield '{"headline":"A new';
        await gate;
        yield JSON.stringify(content).slice('{"headline":"A new'.length);
      })(),
      finishReason: Promise.resolve("stop"),
      usage: Promise.resolve({ inputTokens: 42, outputTokens: 84 }),
    });
    const observer = vi.fn().mockResolvedValue(undefined);
    const adapter = createMastraEditionEditor({
      hosted: { stream } as never,
      policy: { resolve: () => ({ mode: "hosted", timeoutMs: 1000 }) },
      now: () => new Date(),
    });
    const promise = adapter.edit([item], defaults, "2026-10-25", observer);
    await vi.waitFor(() => expect(observer).toHaveBeenCalledWith({ headline: "A new" }));
    finish();
    await expect(promise).resolves.toEqual(content);
    expect(observer).toHaveBeenLastCalledWith(
      content,
      { inputTokens: 42, outputTokens: 84 },
      "validating",
    );
    expect(stream).toHaveBeenCalledOnce();
  });
  it("fails without saving a truncated or invalid final model response", async () => {
    const stream = vi.fn().mockResolvedValue({
      textStream: (async function* () {
        yield '{"headline":"Partial';
      })(),
      finishReason: Promise.resolve("length"),
      usage: Promise.resolve({}),
    });
    const adapter = createMastraEditionEditor({
      hosted: { stream } as never,
      policy: { resolve: () => ({ mode: "hosted", timeoutMs: 1000 }) },
      now: () => new Date(),
    });
    await expect(adapter.edit([item], defaults, "2026-10-25")).rejects.toThrow(
      "Model generation failed",
    );
    expect(stream).toHaveBeenCalledOnce();
  });
});

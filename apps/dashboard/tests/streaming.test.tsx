// @vitest-environment jsdom
import { GenerationDraft } from "../src/features/edition/components/GenerationDraft";
import { readRunEvents, subscribeToRun } from "../src/features/edition/stream";
import type { GenerationRun } from "@news4you/shared";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/api", () => ({ getApiAccessToken: async () => "fixture-access-token" }));

let container: HTMLDivElement, root: Root;

const run: GenerationRun = {
  id: "9f231125-c6c3-4818-8096-b75db2db4517",
  localDate: "2026-10-25",
  kind: "daily",
  status: "running",
  attempts: 1,
  createdAt: "2026-10-25T06:00:00Z",
  progress: {
    sequence: 1,
    stage: "writing",
    updatedAt: "2026-10-25T06:00:01Z",
    draft: {
      headline: "A growing edition",
      sections: [{ title: "News", stories: [{ title: "A story", body: "First words" }] }],
    },
    references: [],
  },
};

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function streamResponse(values: GenerationRun[], size = 7) {
  const bytes = new TextEncoder().encode(
    values.map((value) => `event: snapshot\r\ndata: ${JSON.stringify(value)}\r\n\r\n`).join(""),
  );
  return new Response(
    new ReadableStream({
      start(controller) {
        for (let offset = 0; offset < bytes.length; offset += size)
          controller.enqueue(bytes.slice(offset, offset + size));
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}

describe("live draft transport", () => {
  it("decodes split SSE and UTF-8 chunks, delivers updates before completion, and accepts a reconnect snapshot", async () => {
    const first = { ...run, progress: { ...run.progress!, draft: { headline: "Café ☀" } } };
    const snapshots: GenerationRun[] = [];
    await readRunEvents(streamResponse([first, { ...first, status: "completed" }], 2), (value) =>
      snapshots.push(value),
    );
    expect(snapshots.map((value) => value.status)).toEqual(["running", "completed"]);
    expect(snapshots[0].progress?.draft?.headline).toBe("Café ☀");
    await readRunEvents(streamResponse([first]), (value) => snapshots.push(value));
    expect(snapshots[2]).toEqual(first);
  });
  it("uses a bearer header rather than putting credentials in the stream URL", async () => {
    const request = vi.fn().mockResolvedValue(streamResponse([{ ...run, status: "failed" }]));
    vi.stubGlobal("fetch", request);
    const observer = vi.fn();
    await subscribeToRun(run.id, new AbortController().signal, observer);
    expect(request.mock.calls[0][0]).not.toContain("fixture-access-token");
    expect(request.mock.calls[0][1].headers.Authorization).toBe("Bearer fixture-access-token");
    expect(observer).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }));
  });
});

describe("live newspaper layout", () => {
  it("grows story text in a stable card while keeping the draft label visible", async () => {
    const retry = vi.fn();
    await act(async () =>
      root.render(
        <GenerationDraft run={run} reconnecting={false} starting={false} onRetry={retry} />,
      ),
    );
    const article = container.querySelector("article");
    expect(article?.textContent).toContain("First words");
    const next = {
      ...run,
      progress: {
        ...run.progress!,
        sequence: 2,
        draft: {
          ...run.progress!.draft!,
          sections: [
            {
              title: "News",
              stories: [
                {
                  title: "A story",
                  body: "First words and the next sentence <script>unsafe()</script>",
                  sourceIds: ["source"],
                },
              ],
            },
          ],
        },
        references: [
          {
            id: "source",
            title: "Original source",
            url: "https://example.com",
            publishedAt: "2026-10-25T06:00:00Z",
            fingerprint: "source",
          },
        ],
      },
    };
    await act(async () =>
      root.render(<GenerationDraft run={next} reconnecting starting={false} onRetry={retry} />),
    );
    expect(container.querySelector("article")).toBe(article);
    expect(article?.textContent).toContain("First words and the next sentence");
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("DRAFT · STILL BEING WRITTEN");
    expect(container.textContent).toContain("Reconnecting");
    expect(article?.querySelector("a")?.href).toBe("https://example.com/");
  });
  it("retains failed text and offers retry without presenting it as a saved edition", async () => {
    const retry = vi.fn();
    await act(async () =>
      root.render(
        <GenerationDraft
          run={{ ...run, status: "failed" }}
          reconnecting={false}
          starting={false}
          onRetry={retry}
        />,
      ),
    );
    expect(container.textContent).toContain("DRAFT · NOT SAVED");
    expect(container.textContent).toContain("First words");
    await act(async () => container.querySelector("button")!.click());
    expect(retry).toHaveBeenCalledOnce();
  });
});

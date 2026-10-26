// @vitest-environment jsdom
import { useRunProgress } from "../src/features/edition/hooks/use-run-progress";
import type { GenerationRun } from "@news4you/shared";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ subscribe: vi.fn() }));

vi.mock("../src/features/edition/stream", () => ({ subscribeToRun: mocks.subscribe }));

const pending: GenerationRun = {
  id: "9f231125-c6c3-4818-8096-b75db2db4517",
  localDate: "2026-10-25",
  kind: "daily",
  status: "pending",
  attempts: 0,
};

const growing: GenerationRun = {
  ...pending,
  status: "running",
  attempts: 1,
  progress: {
    sequence: 2,
    stage: "writing",
    references: [],
    draft: { headline: "Growing live" },
    updatedAt: "2026-10-25T06:00:00Z",
  },
};

const refetch = vi.fn();

let container: HTMLDivElement, root: Root;

let emit: (run: GenerationRun) => void;

let signal: AbortSignal;

async function render(run: GenerationRun) {
  await act(async () => root.render(<View run={run} />));
}

function View({ run }: { run: GenerationRun }) {
  const progress = useRunProgress(run, refetch);
  return (
    <output>
      {progress.run?.status}:{progress.run?.progress?.draft?.headline}
    </output>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.subscribe.mockImplementation((_id: string, nextSignal: AbortSignal, onRun: typeof emit) => {
    signal = nextSignal;
    emit = onRun;
    return new Promise<void>((resolve) =>
      nextSignal.addEventListener("abort", () => resolve(), { once: true }),
    );
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it("shows a streaming draft before polling catches up, refetches on completion and aborts on unmount", async () => {
  await render(pending);
  await act(async () => emit(growing));
  expect(container.textContent).toBe("running:Growing live");
  await act(async () => emit({ ...growing, status: "completed" }));
  expect(refetch).toHaveBeenCalledOnce();
  const previous = signal;
  await act(async () => root.unmount());
  expect(previous.aborted).toBe(true);
  root = createRoot(container);
});

it("reopens the stream for retry and restores a persisted draft on a fresh mount", async () => {
  await render(growing);
  expect(container.textContent).toBe("running:Growing live");
  await act(async () => emit({ ...growing, status: "failed" }));
  expect(container.textContent).toBe("failed:Growing live");
  await render(pending);
  expect(container.textContent).toBe("pending:");
  await act(async () => emit(growing));
  expect(container.textContent).toBe("running:Growing live");
  expect(mocks.subscribe).toHaveBeenCalledTimes(2);
});

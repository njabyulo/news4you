import { getApiAccessToken } from "../../lib/api";
import { generationRunSchema, type GenerationRun } from "@news4you/shared";

/** Decode SSE frames across network and UTF-8 boundaries, including reconnect snapshots. */
export async function readRunEvents(response: Response, onRun: (run: GenerationRun) => void) {
  if (
    !response.ok ||
    !response.body ||
    !response.headers.get("content-type")?.includes("text/event-stream")
  )
    throw new Error("Progress stream unavailable");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, "\n");
      if (buffer.length > 512000) throw new Error("Progress frame too large");
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        if (!frame.split("\n").some((line) => line === "event: snapshot")) continue;
        const data = frame
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        const run = generationRunSchema.parse(JSON.parse(data));
        onRun(run);
        if (run.status === "completed" || run.status === "failed") {
          await reader.cancel();
          return;
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function subscribeToRun(
  id: string,
  signal: AbortSignal,
  onRun: (run: GenerationRun) => void,
) {
  const token = await getApiAccessToken();
  const response = await fetch(
    `${import.meta.env.VITE_API_URL ?? "http://localhost:8787"}/v1/runs/${encodeURIComponent(id)}/events`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
      signal,
      cache: "no-store",
    },
  );
  await readRunEvents(response, onRun);
}

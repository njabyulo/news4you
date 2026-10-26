import type { ApiContext } from "../../config/env";
import type { Handler } from "hono";
import { streamSSE } from "hono/streaming";

export function createEditionHandlers() {
  return {
    getV1Editions: async (c) => c.json(await c.get("services").edition.list(c.get("reader"))),
    getV1Today: async (c) => c.json(await c.get("services").edition.today(c.get("reader"))),
    getV1EditionsById: async (c) => {
      const edition = await c.get("services").edition.get(c.get("reader"), c.req.param("id")!);
      return edition ? c.json(edition) : c.json({ error: "Edition not found" }, 404);
    },
    getV1RunsById: async (c) => {
      const run = await c.get("services").edition.run(c.get("reader"), c.req.param("id")!);
      return run ? c.json(run) : c.json({ error: "Run not found" }, 404);
    },
    getV1RunEvents: async (c) => {
      const reader = c.get("reader"),
        id = c.req.param("id")!;
      const edition = c.get("services").edition;
      const initial = await edition.run(reader, id);
      if (!initial) return c.json({ error: "Run not found" }, 404);
      c.header("Cache-Control", "no-store");
      c.header("Content-Encoding", "Identity");
      const response = streamSSE(
        c,
        async (stream) => {
          let run = initial,
            last = "";
          // Short connections bound D1 reads and allow fresh authentication on reconnect.
          for (let tick = 0; tick < 25 && !stream.aborted; tick++) {
            const version = `${run.status}:${run.attempts}:${run.progress?.sequence ?? 0}`;
            if (version !== last) {
              await stream.writeSSE({ event: "snapshot", id: version, data: JSON.stringify(run) });
              last = version;
            } else if (tick % 5 === 0) {
              await stream.writeSSE({ event: "heartbeat", data: "{}" });
            }
            if (run.status === "completed" || run.status === "failed") break;
            await stream.sleep(1000);
            if (stream.aborted) break;
            const next = await edition.run(reader, id);
            if (!next) break;
            run = next;
          }
        },
        async (_error, stream) => {
          await stream.writeSSE({
            event: "error",
            data: '{"error":"Progress temporarily unavailable"}',
          });
        },
      );
      response.headers.set("Cache-Control", "no-store");
      return response;
    },
    postV1Feedback: async (c) =>
      (await c.get("services").edition.feedback(c.get("reader"), await c.req.json()))
        ? c.json({ ok: true })
        : c.json({ error: "Edition not found" }, 404),
  } satisfies Record<string, Handler<ApiContext>>;
}

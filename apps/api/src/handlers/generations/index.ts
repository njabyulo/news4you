import type { ApiContext } from "../../config/env";
import type { Handler } from "hono";

export function createGenerationHandlers() {
  return {
    postV1Generations: async (c) => {
      const service = c.get("services").generation;
      const run = await service.request(c.get("reader"), await c.req.json());
      let dispatch = "not-needed";
      if (run.status === "pending") {
        try {
          if (!c.env.PUBLICATION) throw new Error("Publisher binding unavailable");
          if (!(await service.claimDispatch(run.id))) dispatch = "already-requested";
          else {
            await c.env.PUBLICATION.create({
              id: `${run.id}-${crypto.randomUUID()}`,
              params: { runId: run.id },
            });
            dispatch = "dispatched";
          }
        } catch {
          dispatch = "awaiting-hourly-publisher";
        }
      }
      return c.json({ runId: run.id, status: run.status, dispatch }, 202);
    },
  } satisfies Record<string, Handler<ApiContext>>;
}

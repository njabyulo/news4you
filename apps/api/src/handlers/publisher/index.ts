import { collectGoogle, GoogleError } from "../../adapters/google";
import type { ApiContext } from "../../config/env";
import type { Handler } from "hono";

export function createPublisherHandlers() {
  return {
    postInternalSchedule: async (c) =>
      c.json({ due: await c.get("services").generation.schedule() }),
    postInternalPending: async (c) =>
      c.json({ pending: await c.get("services").generation.pending() }),
    postInternalClaim: async (c) => {
      const body = (await c.req.json().catch(() => ({}))) as { id?: string };
      return c.json({ run: await c.get("services").generation.claim(body.id) });
    },
    postInternalDispatchable: async (c) =>
      c.json({ runs: await c.get("services").generation.pendingRunIds() }),
    postInternalRunsByIdPersonal: async (c) => {
      const context = await c
        .get("services")
        .generation.personalContext(c.req.param("id")!, await c.req.json());
      if (!context) return c.json({ error: "Lease expired" }, 409);
      try {
        return c.json({
          items: await collectGoogle(
            c.env,
            context.readerId,
            context.preferences,
            context.localDate,
          ),
        });
      } catch (error) {
        return c.json(
          {
            error:
              error instanceof GoogleError
                ? error.message
                : "Personal sources could not be collected",
          },
          502,
        );
      }
    },
    postInternalRunsByIdProgress: async (c) =>
      (await c.get("services").generation.progress(c.req.param("id")!, await c.req.json()))
        ? c.json({ ok: true })
        : c.json({ error: "Lease expired or stale progress" }, 409),
    postInternalRunsByIdFail: async (c) =>
      (await c.get("services").generation.fail(c.req.param("id")!, await c.req.json()))
        ? c.json({ ok: true })
        : c.json({ error: "Lease expired" }, 409),
    postInternalRunsByIdResult: async (c) => {
      const result = await c
        .get("services")
        .edition.publish(c.req.param("id")!, await c.req.json());
      if (result.kind === "expired") return c.json({ error: "Lease expired" }, 409);
      if (result.kind === "invalid") return c.json({ error: result.message }, 400);
      return c.json({ editionId: result.editionId }, 201);
    },
  } satisfies Record<string, Handler<ApiContext>>;
}

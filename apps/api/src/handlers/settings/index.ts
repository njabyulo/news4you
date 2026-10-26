import type { ApiContext } from "../../config/env";
import type { Handler } from "hono";

export function createSettingsHandlers() {
  return {
    getV1Preferences: async (c) =>
      c.json(await c.get("services").reader.preferences(c.get("reader"))),
    putV1Preferences: async (c) =>
      c.json(await c.get("services").reader.savePreferences(c.get("reader"), await c.req.json())),
    getV1Sources: async (c) => c.json(await c.get("services").reader.sources(c.get("reader"))),
    putV1Sources: async (c) =>
      c.json(await c.get("services").reader.saveSources(c.get("reader"), await c.req.json())),
  } satisfies Record<string, Handler<ApiContext>>;
}

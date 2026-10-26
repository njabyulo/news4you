import type { ApiContext } from "../config/env";
import { createSettingsHandlers } from "../handlers/settings";
import type { Hono } from "hono";

export function registerSettingsRoutes(app: Hono<ApiContext>) {
  const handlers = createSettingsHandlers();
  app.get("/v1/preferences", handlers.getV1Preferences);
  app.put("/v1/preferences", handlers.putV1Preferences);
  app.get("/v1/sources", handlers.getV1Sources);
  app.put("/v1/sources", handlers.putV1Sources);
}

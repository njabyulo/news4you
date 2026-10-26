import type { ApiContext } from "../config/env";
import { createGenerationHandlers } from "../handlers/generations";
import type { Hono } from "hono";

export function registerGenerationRoutes(app: Hono<ApiContext>) {
  const handlers = createGenerationHandlers();
  app.post("/v1/generations", handlers.postV1Generations);
}

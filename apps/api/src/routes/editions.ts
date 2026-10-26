import type { ApiContext } from "../config/env";
import { createEditionHandlers } from "../handlers/editions";
import type { Hono } from "hono";

export function registerEditionRoutes(app: Hono<ApiContext>) {
  const handlers = createEditionHandlers();
  app.get("/v1/editions", handlers.getV1Editions);
  app.get("/v1/today", handlers.getV1Today);
  app.get("/v1/editions/:id", handlers.getV1EditionsById);
  app.get("/v1/runs/:id/events", handlers.getV1RunEvents);
  app.get("/v1/runs/:id", handlers.getV1RunsById);
  app.post("/v1/feedback", handlers.postV1Feedback);
}

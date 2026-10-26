import type { ApiContext } from "../config/env";
import { createPublisherHandlers } from "../handlers/publisher";
import type { Hono } from "hono";

export function registerPublisherRoutes(app: Hono<ApiContext>) {
  const handlers = createPublisherHandlers();
  app.post("/internal/schedule", handlers.postInternalSchedule);
  app.post("/internal/pending", handlers.postInternalPending);
  app.post("/internal/dispatchable", handlers.postInternalDispatchable);
  app.post("/internal/claim", handlers.postInternalClaim);
  app.post("/internal/runs/:id/personal", handlers.postInternalRunsByIdPersonal);
  app.post("/internal/runs/:id/progress", handlers.postInternalRunsByIdProgress);
  app.post("/internal/runs/:id/fail", handlers.postInternalRunsByIdFail);
  app.post("/internal/runs/:id/result", handlers.postInternalRunsByIdResult);
}

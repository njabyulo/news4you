import { GoogleError } from "../adapters/google";
import type { ApiContext } from "../config/env";
import type { ErrorHandler } from "hono";
import { z } from "zod";

export const handleError: ErrorHandler<ApiContext> = (e, c) => {
  if (e instanceof GoogleError) return c.json({ error: e.message }, 502);
  if (e instanceof z.ZodError) return c.json({ error: "Invalid request", issues: e.issues }, 400);
  if (e instanceof SyntaxError) return c.json({ error: "Invalid JSON" }, 400);
  // Drizzle errors can contain bound private content and encrypted credentials.
  console.error("Request failed");
  return c.json({ error: "Service unavailable" }, 500);
};

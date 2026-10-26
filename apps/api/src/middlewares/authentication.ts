import type { ApiContext } from "../config/env";
import { createMiddleware } from "hono/factory";

export const readerAuthentication = createMiddleware<ApiContext>(async (context, next) => {
  const identity = await context.get("auth").reader(context.req.header("Authorization"));
  if (identity.kind !== "authenticated")
    return context.json(
      { error: identity.kind === "missing" ? "Authentication required" : "Invalid access token" },
      401,
    );
  context.set("reader", identity.subject);
  await context.get("services").reader.ensure(identity.subject);
  await next();
});

export const publisherAuthentication = createMiddleware<ApiContext>(async (context, next) => {
  if (!context.get("auth").publisher(context.req.header("Authorization")))
    return context.json({ error: "Unauthorized" }, 401);
  await next();
});

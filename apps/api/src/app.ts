import { createAuth0Verifier } from "./adapters/auth0";
import { googleRoutes, googleCallback } from "./adapters/google";
import type { ApiContext } from "./config/env";
import { readerAuthentication, publisherAuthentication } from "./middlewares/authentication";
import { handleError } from "./middlewares/errors";
import { registerEditionRoutes } from "./routes/editions";
import { registerGenerationRoutes } from "./routes/generations";
import { registerPublisherRoutes } from "./routes/publisher";
import { registerSettingsRoutes } from "./routes/settings";
import { createAuthService } from "@news4you/core/auth";
import { composeNewspaperServices } from "@news4you/core/newspaper/services";
import { createDatabaseClient } from "@news4you/database/client";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import type { JWTVerifyGetKey } from "jose";

export function createApp(keyOverride?: JWTVerifyGetKey) {
  const app = new Hono<ApiContext>();
  app.use("*", async (c, next) => {
    c.set(
      "auth",
      createAuthService({
        verifier: createAuth0Verifier({
          domain: c.env.AUTH0_DOMAIN,
          audience: c.env.AUTH0_AUDIENCE,
          keyOverride,
        }),
        publisherToken: c.env.PUBLISHER_TOKEN,
      }),
    );
    c.set("services", composeNewspaperServices(createDatabaseClient(c.env.DB)));
    await next();
  });
  app.use(
    "*",
    cors({
      origin: (origin, c) =>
        [c.env.DASHBOARD_ORIGIN, "http://localhost:5173"].includes(origin) ? origin : undefined,
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "PUT", "POST", "OPTIONS"],
    }),
  );
  app.use(
    "*",
    bodyLimit({
      maxSize: 512 * 1024,
      onError: (c) => c.json({ error: "Request too large" }, 413),
    }),
  );
  app.onError(handleError);
  app.get("/health", (c) => c.json({ ok: true }));
  app.use("/v1/*", readerAuthentication);
  app.route("/v1/google", googleRoutes());
  app.get("/oauth/google/callback", googleCallback(keyOverride));
  registerSettingsRoutes(app);
  registerEditionRoutes(app);
  registerGenerationRoutes(app);
  app.use("/internal/*", publisherAuthentication);
  registerPublisherRoutes(app);
  return app;
}

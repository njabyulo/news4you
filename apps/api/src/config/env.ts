import type { AuthServicePort } from "@news4you/core/auth";
import type { NewspaperServices } from "@news4you/core/newspaper/services";

export interface ApiContext {
  Bindings: Env;
  Variables: { reader: string; services: NewspaperServices; auth: AuthServicePort };
}

export interface Env {
  DB: D1Database;
  PUBLICATION?: Workflow<{ runId: string }>;
  AUTH0_GOOGLE_CLIENT_ID?: string;
  AUTH0_GOOGLE_CLIENT_SECRET?: string;
  AUTH0_GOOGLE_CONNECTION?: string;
  GOOGLE_TOKEN_ENCRYPTION_KEY?: string;
  GOOGLE_CALLBACK_URL?: string;
  AUTH0_DOMAIN: string;
  AUTH0_AUDIENCE: string;
  DASHBOARD_ORIGIN: string;
  PUBLISHER_TOKEN: string;
}

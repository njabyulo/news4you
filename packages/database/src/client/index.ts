import * as schema from "../schema";
import type { D1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";

export type DatabaseBinding = D1Database;

export type DatabaseClient = ReturnType<typeof createDatabaseClient>;

export function createDatabaseClient(binding: DatabaseBinding) {
  return drizzle(binding, { schema });
}

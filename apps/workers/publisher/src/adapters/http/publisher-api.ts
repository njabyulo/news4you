import type { PublicationQueue } from "@news4you/shared";
import {
  claimedRunSchema,
  sourceItemSchema,
  type ClaimedRun,
  type PublicationResult,
} from "@news4you/shared";
import { z } from "zod";

interface PublisherApiOptions {
  baseUrl: string;
  token: string;
  fetch?: typeof fetch;
}

/** HTTP adapter: credentials and response validation stay outside orchestration. */
export function createPublisherApi(options: PublisherApiOptions): PublicationQueue {
  const request = options.fetch ?? fetch;
  async function post(path: string, body: unknown = {}): Promise<unknown> {
    const response = await request(new URL(path, options.baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) {
      if (path.endsWith("/personal") && response.status === 502)
        throw new Error(
          "Google content could not be collected. Check Google consent and reconnect in Settings.",
        );
      throw new Error(`Publisher API ${response.status}`);
    }
    try {
      return await response.json();
    } catch {
      throw new Error("Invalid publisher API response");
    }
  }
  async function validated<T>(path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
    const payload = await post(path, body);
    const result = schema.safeParse(payload);
    // Never include response bodies or validation details in operational logs.
    if (!result.success) throw new Error("Invalid publisher API response");
    return result.data;
  }
  const runPath = (run: ClaimedRun, operation: string) => `/internal/runs/${run.id}/${operation}`;
  return {
    async schedule() {
      await post("/internal/schedule");
    },
    async claim(id) {
      return (
        await validated(
          "/internal/claim",
          z.object({ run: claimedRunSchema.nullable() }),
          id ? { id } : {},
        )
      ).run;
    },
    async progress(run, update) {
      await post(runPath(run, "progress"), { ...update, leaseToken: run.leaseToken });
    },
    personal(run) {
      return validated(runPath(run, "personal"), z.object({ items: z.array(sourceItemSchema) }), {
        leaseToken: run.leaseToken,
      });
    },
    async publish(run, result: PublicationResult) {
      await post(runPath(run, "result"), result);
    },
    async fail(run, message) {
      await post(runPath(run, "fail"), {
        leaseToken: run.leaseToken,
        error: message.slice(0, 500),
      });
    },
  };
}

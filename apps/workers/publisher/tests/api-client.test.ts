import { run, item } from "../../../../packages/core/tests/fixtures/publication";
import { createPublisherApi } from "../src/adapters/http/publisher-api";
import { describe, expect, it, vi } from "vitest";

describe("publisher HTTP adapter", () => {
  it("validates claimed work and passes credentials only in headers", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ run }));
    const api = createPublisherApi({
      baseUrl: "https://api.example.com",
      token: "test-only",
      fetch: request,
    });
    expect(await api.claim()).toEqual(run);
    const [url, options] = request.mock.calls[0];
    expect(String(url)).toBe("https://api.example.com/internal/claim");
    expect(options).toMatchObject({
      method: "POST",
      headers: { Authorization: "Bearer test-only" },
      body: "{}",
    });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });
  it("rejects malformed claimed work without leaking payload details", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        run: { ...run, preferences: { timezone: "private-response-text" } },
      }),
    );
    const api = createPublisherApi({
      baseUrl: "https://api.example.com",
      token: "test-only",
      fetch: request,
    });
    await expect(api.claim()).rejects.toThrow(/^Invalid publisher API response$/);
  });
  it("preserves the Google recovery message and rejects malformed personal sources", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("private error details", { status: 502 }))
      .mockResolvedValueOnce(Response.json({ items: [{ ...item, kind: "unknown" }] }));
    const api = createPublisherApi({
      baseUrl: "https://api.example.com",
      token: "test-only",
      fetch: request,
    });
    await expect(api.personal(run)).rejects.toThrow("Check Google consent and reconnect");
    await expect(api.personal(run)).rejects.toThrow(/^Invalid publisher API response$/);
  });
  it("does not leak a malformed JSON response into an error", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("private invalid JSON response"));
    const api = createPublisherApi({
      baseUrl: "https://api.example.com",
      token: "test-only",
      fetch: request,
    });
    await expect(api.claim()).rejects.toThrow(/^Invalid publisher API response$/);
  });
  it("bounds persisted errors and sends the lease token on failure", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }));
    const api = createPublisherApi({
      baseUrl: "https://api.example.com",
      token: "test-only",
      fetch: request,
    });
    await api.fail(run, "x".repeat(800));
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({
      leaseToken: run.leaseToken,
      error: "x".repeat(500),
    });
  });
});

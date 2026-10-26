import { schedulePublications, type ScheduleEnv } from "../src/handlers/schedule";
import { describe, it, expect, vi } from "vitest";

describe("hosted schedule", () => {
  it("schedules through the API binding and starts a durable instance per pending run", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ scheduled: 2 }))
      .mockResolvedValueOnce(Response.json({ runs: [{ id: "first" }, { id: "second" }] }));
    const createBatch = vi.fn().mockResolvedValue([]);
    await schedulePublications({
      API_URL: "https://api.example.com",
      PUBLISHER_TOKEN: "test-only",
      API: { fetch: request },
      PUBLICATION: { createBatch },
    } as unknown as ScheduleEnv);
    expect(request.mock.calls.map((c) => c[0].pathname)).toEqual([
      "/internal/schedule",
      "/internal/dispatchable",
    ]);
    expect(request.mock.calls[0][1].headers.Authorization).toBe("Bearer test-only");
    expect(createBatch).toHaveBeenCalledWith([
      { id: expect.stringMatching(/^first-/), params: { runId: "first" } },
      { id: expect.stringMatching(/^second-/), params: { runId: "second" } },
    ]);
  });
  it("does not create workflows when the queue is empty", async () => {
    const request = vi.fn().mockImplementation(async () => Response.json({ runs: [] }));
    const createBatch = vi.fn();
    await schedulePublications({
      API_URL: "https://api.example.com",
      PUBLISHER_TOKEN: "test",
      API: { fetch: request },
      PUBLICATION: { createBatch },
    } as unknown as ScheduleEnv);
    expect(createBatch).not.toHaveBeenCalled();
  });
});

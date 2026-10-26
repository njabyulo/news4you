import { createCloudflareSources } from "../src/adapters/sources/cloudflare";
import { defaults } from "@news4you/shared";
import { describe, it, expect, vi } from "vitest";

const feed = { id: "public", name: "Public feed", url: "https://example.com/rss", enabled: true };

const weather = {
  daily: {
    time: ["2026-10-25"],
    temperature_2m_max: [25],
    temperature_2m_min: [12],
    precipitation_probability_max: [10],
  },
};

function rss() {
  return `<rss><channel><item><title>Science update</title><link>https://example.com/story</link><pubDate>${new Date().toUTCString()}</pubDate><description>Public facts.</description></item></channel></rss>`;
}

describe("Cloudflare public sources", () => {
  it("calls native fetch without a class receiver and collects public feeds and weather", async () => {
    const request = vi.fn(function (this: unknown, input: RequestInfo | URL) {
      // Reproduce workerd's receiver requirement; Node fetch alone does not catch this.
      expect(this).toBeUndefined();
      const url = String(input);
      if (url.includes("dns-query"))
        return Promise.resolve(Response.json({ Answer: [{ type: 1, data: "93.184.216.34" }] }));
      if (url.includes("open-meteo")) return Promise.resolve(Response.json(weather));
      return Promise.resolve(new Response(rss()));
    });
    const items = await createCloudflareSources(request as typeof fetch).collect([feed], defaults);
    expect(items.map((item) => item.kind)).toEqual(["rss", "weather"]);
    expect(request).toHaveBeenCalledTimes(4);
  });
  it("uses the same-source Hacker News RSS mirror when the primary feed rejects Workers", async () => {
    const request = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("dns-query"))
        return Response.json({ Answer: [{ type: 1, data: "93.184.216.34" }] });
      if (url === "https://news.ycombinator.com/rss") return new Response("Sorry", { status: 419 });
      if (url === "https://hnrss.org/frontpage") return new Response(rss());
      return Response.json(weather);
    });
    const items = await createCloudflareSources(request as typeof fetch).collect(
      [{ ...feed, url: "https://news.ycombinator.com/rss" }],
      defaults,
    );
    expect(items.map((item) => item.kind)).toEqual(["rss", "weather"]);
    expect(
      request.mock.calls.some((call) => String(call[0]) === "https://hnrss.org/frontpage"),
    ).toBe(true);
  });
  it("rejects private DNS results before requesting the feed", async () => {
    const request = vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("dns-query")
        ? Response.json({ Answer: [{ type: 1, data: "127.0.0.1" }] })
        : Response.json(weather),
    );
    const items = await createCloudflareSources(request as typeof fetch).collect([feed], defaults);
    expect(items.map((item) => item.kind)).toEqual(["weather"]);
    expect(request.mock.calls.some((call) => String(call[0]) === feed.url)).toBe(false);
  });
  it("rejects redirects and oversized bodies without following them", async () => {
    for (const response of [
      new Response(null, { status: 302, headers: { Location: "http://127.0.0.1/" } }),
      new Response("x".repeat(500001)),
    ]) {
      const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes("dns-query"))
          return Response.json({ Answer: [{ type: 1, data: "93.184.216.34" }] });
        if (String(input).includes("open-meteo")) return Response.json(weather);
        expect(init?.redirect).toBe("manual");
        return response;
      });
      expect(
        (await createCloudflareSources(request as typeof fetch).collect([feed], defaults)).map(
          (item) => item.kind,
        ),
      ).toEqual(["weather"]);
      expect(request).toHaveBeenCalledTimes(4);
    }
  });
  it("fails when all public sources are unavailable", async () => {
    const request = vi.fn(async () => new Response(null, { status: 503 }));
    await expect(
      createCloudflareSources(request as typeof fetch).collect([feed], defaults),
    ).rejects.toThrow("Public sources are unavailable");
  });
});

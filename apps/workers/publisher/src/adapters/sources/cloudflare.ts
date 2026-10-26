import { parseFeed } from "./feed";
import type { Preferences, Source, SourceItem } from "@news4you/shared";
import ipaddr from "ipaddr.js";

export const createCloudflareSources = (request: typeof fetch = fetch) =>
  new CloudflareSources(request);

export class CloudflareSources {
  private readonly request: typeof fetch;
  constructor(request: typeof fetch) {
    // Workerd global fetch rejects a class instance as its receiver.
    this.request = (input, init) => request(input, init);
  }
  async collect(sources: Source[], preferences: Preferences) {
    // Bound parallel connections; Workers permit six simultaneous outgoing connections.
    const items: SourceItem[] = [];
    for (const source of sources.filter((source) => source.enabled)) {
      try {
        items.push(...(await this.feed(source)));
      } catch (error) {
        console.warn(
          "A public feed was unavailable",
          source.id,
          error instanceof Error ? error.message.slice(0, 200) : "Source error",
        );
      }
    }
    try {
      items.push(await this.weather(preferences));
    } catch (error) {
      console.warn(
        "Weather was unavailable",
        error instanceof Error ? error.message.slice(0, 200) : "Source error",
      );
    }
    if (!items.length) throw new Error("Public sources are unavailable");
    return items;
  }
  private async feed(source: Source): Promise<SourceItem[]> {
    try {
      await this.validate(source.url);
      return parseFeed(await this.text(source.url, 500000), source);
    } catch (error) {
      // Hacker News rejects Cloudflare datacentres (HTTP 419). This RSS mirror
      // serves the same front-page source and retains original article links.
      if (source.url !== "https://news.ycombinator.com/rss") throw error;
      const mirror = "https://hnrss.org/frontpage";
      await this.validate(mirror);
      return parseFeed(await this.text(mirror, 500000), source);
    }
  }
  private async validate(input: string) {
    const url = new URL(input);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    )
      throw new Error("Public HTTPS required");
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    if (
      !hostname.includes(".") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".internal")
    )
      throw new Error("Private hostname");
    if (ipaddr.isValid(hostname)) {
      if (ipaddr.parse(hostname).range() !== "unicast") throw new Error("Private address");
      return;
    }
    const addresses: string[] = [];
    for (const type of ["A", "AAAA"]) {
      const response = await this.request(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`,
        { headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(8000) },
      );
      if (!response.ok) throw new Error("DNS lookup failed");
      const data = (await response.json()) as { Answer?: { type: number; data: string }[] };
      addresses.push(
        ...(data.Answer ?? [])
          .filter((record) => record.type === 1 || record.type === 28)
          .map((record) => record.data),
      );
    }
    if (
      !addresses.length ||
      addresses.some(
        (address) => !ipaddr.isValid(address) || ipaddr.parse(address).range() !== "unicast",
      )
    )
      throw new Error("Private or reserved address");
  }
  private async text(url: string, limit: number) {
    const response = await this.request(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "News4You/1.0" },
    });
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new Error(`Source unavailable (HTTP ${response.status})`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let size = 0,
      text = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > limit) throw new Error("Source exceeds size limit");
        text += decoder.decode(value, { stream: true });
      }
      return text + decoder.decode();
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
  private async weather(preferences: Preferences): Promise<SourceItem> {
    const locations = {
      Johannesburg: [-26.2041, 28.0473],
      "Cape Town": [-33.9249, 18.4241],
      Durban: [-29.8587, 31.0218],
    };
    const [lat, lon] = locations[preferences.weatherCity];
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=${encodeURIComponent(preferences.timezone)}&forecast_days=1`;
    const data = JSON.parse(await this.text(url, 50000));
    return {
      id: "weather-" + data.daily.time[0],
      title: preferences.weatherCity + " weather",
      url: "https://open-meteo.com/",
      publishedAt: new Date().toISOString(),
      fingerprint: "weather-" + preferences.weatherCity + "-" + data.daily.time[0],
      content: `${preferences.weatherCity}: ${data.daily.temperature_2m_min[0]}–${data.daily.temperature_2m_max[0]}°C; rain chance ${data.daily.precipitation_probability_max[0]}%.`,
      kind: "weather",
    };
  }
}

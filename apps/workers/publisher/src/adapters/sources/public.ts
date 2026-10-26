import { parseFeed } from "./feed";
import type { Source, SourceItem, Preferences } from "@news4you/shared";
import ipaddr from "ipaddr.js";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";

export { parseFeed } from "./feed";

export async function collect(sources: Source[], p: Preferences, adapters = { rss, weather }) {
  const results = await Promise.allSettled([
    ...sources.filter((x) => x.enabled).map(adapters.rss),
    adapters.weather(p),
  ]);
  const items: SourceItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") items.push(...(Array.isArray(r.value) ? r.value : [r.value]));
    else
      console.warn(
        "A source was unavailable:",
        r.reason instanceof Error ? r.reason.message : "Source failed",
      );
  }
  if (!items.length) throw new Error("All live sources are unavailable");
  return items;
}

export async function fetchText(input: string, limit = 500000): Promise<string> {
  const { url, addresses } = await resolvePublicUrl(input);
  const pinned = addresses[0];
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        signal: AbortSignal.timeout(12000),
        headers: {
          "User-Agent": "News4You/1.0",
          "Accept-Encoding": "identity",
        },
        lookup: (_hostname, options, callback) =>
          options.all ? callback(null, addresses) : callback(null, pinned.address, pinned.family),
      },
      (response) => {
        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          response.destroy();
          reject(new Error(`Source responded ${response.statusCode}`));
          return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > limit) {
            response.destroy(new Error("Source exceeds size limit"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

export async function publicUrl(input: string) {
  return (await resolvePublicUrl(input)).url;
}

async function resolvePublicUrl(input: string) {
  const url = new URL(input);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443"))
    throw new Error("Only public HTTPS feeds are permitted");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await lookup(host, { all: true });
  if (
    !addresses.length ||
    addresses.some(({ address }) => ipaddr.parse(address).range() !== "unicast")
  )
    throw new Error("Private or reserved feed address");
  return { url, addresses };
}

export async function rss(source: Source) {
  return parseFeed(await fetchText(source.url), source);
}

export function samplePersonalData(now = new Date()): SourceItem[] {
  return [
    {
      id: "demo-calendar",
      title: "Sample calendar: design review at 10:00",
      content:
        "DEMO DATA. Design review at 10:00, followed by a protected lunch break at 12:30. Not connected to a real calendar.",
      kind: "calendar",
      url: "https://news4you.njabulomajozi.com/demo",
      publishedAt: now.toISOString(),
      fingerprint: "sample-calendar-" + now.toISOString().slice(0, 10),
    },
    {
      id: "demo-email",
      title: "Sample inbox: community newsletter",
      content:
        "DEMO DATA. The neighbourhood community garden has a volunteer morning this Saturday. Not connected to a real inbox.",
      kind: "email",
      url: "https://news4you.njabulomajozi.com/demo",
      publishedAt: now.toISOString(),
      fingerprint: "sample-email-" + now.toISOString().slice(0, 10),
    },
  ];
}

export async function weather(p: Preferences): Promise<SourceItem> {
  const locations = {
    Johannesburg: [-26.2041, 28.0473],
    "Cape Town": [-33.9249, 18.4241],
    Durban: [-29.8587, 31.0218],
  };
  const [lat, lon] = locations[p.weatherCity];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=${encodeURIComponent(p.timezone)}&forecast_days=1`;
  const data = JSON.parse(await fetchText(url, 50000));
  const text = `${p.weatherCity}: ${data.daily.temperature_2m_min[0]}–${data.daily.temperature_2m_max[0]}°C; rain chance ${data.daily.precipitation_probability_max[0]}%.`;
  return {
    id: "weather-" + data.daily.time[0],
    title: p.weatherCity + " weather",
    url: "https://open-meteo.com/",
    publishedAt: new Date().toISOString(),
    fingerprint: "weather-" + p.weatherCity + "-" + data.daily.time[0],
    content: text,
    kind: "weather",
  };
}

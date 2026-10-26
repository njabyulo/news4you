import type { Preferences } from "@news4you/shared";

export function isDue(now: Date, p: Preferences): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: p.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const time =
    parts.find((x) => x.type === "hour")!.value +
    ":" +
    parts.find((x) => x.type === "minute")!.value;
  return p.scheduled && time >= p.deliveryTime;
}

export function localDate(now: Date, timezone: string): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"].map((k) => p.find((x) => x.type === k)!.value).join("-");
}

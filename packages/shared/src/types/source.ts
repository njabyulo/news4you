import { z } from "zod";

export interface Reference {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  fingerprint: string;
}

export type Source = z.infer<typeof sourceSchema>;

export type SourceItem = z.infer<typeof sourceItemSchema>;

export const sourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  name: z.string().min(1).max(80),
  url: z
    .string()
    .url()
    .refine((v) => new URL(v).protocol === "https:", "HTTPS required"),
  enabled: z.boolean(),
});

export const sourceItemSchema = z.object({
  id: z.string().max(160),
  title: z.string().max(300),
  url: z
    .string()
    .url()
    .refine((value) => ["https:", "http:"].includes(new URL(value).protocol)),
  publishedAt: z.string().datetime(),
  fingerprint: z.string().max(500),
  content: z.string().max(12000),
  kind: z.enum(["rss", "weather", "calendar", "email"]),
});

export const defaultSources: Source[] = [
  {
    id: "bbc-world",
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    enabled: true,
  },
  {
    id: "bbc-tech",
    name: "BBC Technology",
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    enabled: true,
  },
  {
    id: "nasa",
    name: "NASA",
    url: "https://www.nasa.gov/feed/",
    enabled: true,
  },
];

export const sourceListSchema = z
  .array(sourceSchema)
  .max(10)
  .refine(
    (sources) => new Set(sources.map((source) => source.id)).size === sources.length,
    "Duplicate source id",
  );

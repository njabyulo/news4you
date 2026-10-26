import { z } from "zod";

export type Preferences = z.infer<typeof preferencesSchema>;

export const preferencesSchema = z.object({
  interests: z
    .array(z.string().trim().min(1).max(60))
    .max(20)
    .default(["Technology", "South Africa", "Science"]),
  timezone: z
    .string()
    .refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, "Invalid timezone")
    .default("Africa/Johannesburg"),
  readingMinutes: z.number().int().min(2).max(15).default(5),
  deliveryTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .default("06:00"),
  scheduled: z.boolean().default(true),
  weatherCity: z.enum(["Johannesburg", "Cape Town", "Durban"]).default("Johannesburg"),
});

export const defaults = preferencesSchema.parse({});

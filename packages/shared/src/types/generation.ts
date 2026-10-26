import { preferencesSchema } from "./reader";
import { sourceSchema, sourceItemSchema } from "./source";
import { z } from "zod";

export type ClaimedRun = z.infer<typeof claimedRunSchema>;

export type DraftContent = z.infer<typeof draftContentSchema>;

export type DraftObserver = (
  draft: DraftContent,
  usage?: TokenUsage,
  stage?: "writing" | "validating",
) => Promise<void>;

export type GenerationProgress = z.infer<typeof generationProgressSchema>;

export interface GenerationRun {
  id: string;
  localDate: string;
  kind: "daily" | "preview";
  status: "pending" | "running" | "completed" | "failed";
  editionId?: string;
  error?: string;
  attempts: number;
  createdAt?: string;
  progress?: GenerationProgress;
}

export type ProgressUpdate = z.infer<typeof progressUpdateSchema>;

export type TokenUsage = z.infer<typeof tokenUsageSchema>;

export const claimedRunSchema = z.object({
  id: z.string().uuid(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(["daily", "preview"]),
  leaseToken: z.string().uuid(),
  preferences: preferencesSchema,
  sources: z.array(sourceSchema),
  covered: z.array(z.string()),
});

export const generationSchema = z.object({
  kind: z.enum(["daily", "preview"]).default("daily"),
});

export const runLeaseSchema = z.object({ leaseToken: z.string().uuid() });

export const generationFailureSchema = z.object({
  leaseToken: z.string().uuid(),
  error: z.string().max(500),
});

export const draftContentSchema = z.object({
  headline: z.string().max(180).optional(),
  intro: z.string().max(700).optional(),
  sections: z
    .array(
      z.object({
        title: z.string().max(80).optional(),
        stories: z
          .array(
            z.object({
              title: z.string().max(180).optional(),
              body: z.string().max(4000).optional(),
              sourceIds: z.array(z.string().max(160)).max(8).optional(),
            }),
          )
          .max(8)
          .optional(),
      }),
    )
    .max(6)
    .optional(),
});

export const tokenUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
});

export const generationProgressSchema = z.object({
  sequence: z.number().int().positive(),
  stage: z.enum(["collecting", "writing", "validating", "saving"]),
  draft: draftContentSchema.optional(),
  references: z
    .array(
      sourceItemSchema.pick({
        id: true,
        title: true,
        url: true,
        publishedAt: true,
        fingerprint: true,
      }),
    )
    .max(25)
    .default([]),
  usage: tokenUsageSchema.optional(),
  updatedAt: z.string().datetime(),
});

export const progressUpdateSchema = generationProgressSchema.omit({ updatedAt: true }).extend({
  leaseToken: z.string().uuid(),
});

export const generationRunSchema = z.object({
  id: z.string().uuid(),
  localDate: z.string(),
  kind: z.enum(["daily", "preview"]),
  status: z.enum(["pending", "running", "completed", "failed"]),
  attempts: z.number(),
  editionId: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.string().optional(),
  progress: generationProgressSchema.optional(),
});

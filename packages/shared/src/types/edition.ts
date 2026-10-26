import type { Reference } from "./source";
import { z } from "zod";

export type Agenda = z.infer<typeof agendaSchema>;

export interface Edition {
  id: string;
  localDate: string;
  kind: "daily" | "preview";
  createdAt: string;
  readingMinutes: number;
  content: EditionContent;
  references: Reference[];
  agenda?: Agenda;
  emails?: Agenda;
}

export type EditionContent = z.infer<typeof editionContentSchema>;

export type Feedback = z.infer<typeof feedbackSchema>;

export const agendaSchema = z
  .array(
    z.object({
      title: z.string().max(300),
      detail: z.string().max(1500),
      url: z
        .string()
        .url()
        .refine((v) => new URL(v).protocol === "https:"),
    }),
  )
  .max(100);

export const storySchema = z.object({
  title: z.string().min(1).max(180),
  body: z.string().min(1).max(4000),
  sourceIds: z.array(z.string()).min(1).max(8),
});

export const editionContentSchema = z.object({
  headline: z.string().min(1).max(180),
  intro: z.string().max(700),
  sections: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        stories: z.array(storySchema).min(1).max(8),
      }),
    )
    .min(1)
    .max(6),
});

export const feedbackSchema = z.object({
  editionId: z.string().uuid(),
  rating: z.enum(["helpful", "unhelpful"]),
  comment: z.string().max(1000).default(""),
});

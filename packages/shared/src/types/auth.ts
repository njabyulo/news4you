import { z } from "zod";

export type GoogleSettings = z.infer<typeof googleSettingsSchema>;

export type ReaderAuthentication =
  | { kind: "authenticated"; subject: string }
  | { kind: "missing" | "invalid" };

export interface TokenVerifier {
  verify(token: string): Promise<string>;
}

export const googleSettingsSchema = z
  .object({
    calendar: z.boolean().default(true),
    labelId: z
      .string()
      .regex(/^Label_[a-zA-Z0-9_-]+$/)
      .max(200)
      .nullable()
      .default(null),
    emailMode: z.enum(["none", "label", "all"]).optional(),
  })
  .superRefine((value, context) => {
    if (value.emailMode === "label" && !value.labelId)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["labelId"],
        message: "Choose a Gmail label",
      });
  })
  .transform((value) => {
    // Existing saved label selections keep their original, narrower behavior.
    const emailMode = value.emailMode ?? (value.labelId ? "label" : "none");
    return {
      calendar: value.calendar,
      emailMode,
      labelId: emailMode === "label" ? value.labelId : null,
    };
  });

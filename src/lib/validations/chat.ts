import { z } from "zod/v4";

export const chatRequestSchema = z.object({
  message: z.string().min(1, "Message is required.").max(10000, "Message is too long."),
  conversationId: z.string().uuid().nullish(),
  documentIds: z
    .array(z.string().uuid())
    .min(1, "At least one document must be selected.")
    .max(20, "Too many documents selected."),
});

export type ChatRequestBody = z.infer<typeof chatRequestSchema>;

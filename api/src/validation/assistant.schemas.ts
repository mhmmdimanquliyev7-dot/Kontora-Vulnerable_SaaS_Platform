import { z } from "zod";

export const chatMessageSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(1000),
});

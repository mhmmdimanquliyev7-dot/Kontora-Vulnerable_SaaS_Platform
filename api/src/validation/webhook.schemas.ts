import { z } from "zod";

// The concrete set of events a webhook can subscribe to — kept small and
// explicit rather than "subscribe to everything," matching the two events
// actually wired up in invoice.service.ts's dispatchEvent calls.
export const WEBHOOK_EVENTS = ["invoice.created", "invoice.paid"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

const webhookUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .url("Enter a valid URL")
  .refine((v) => v.startsWith("https://"), "Webhook URLs must use HTTPS");

export const createWebhookSchema = z.object({
  url: webhookUrlSchema,
  description: z.string().trim().max(200).optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, "Select at least one event"),
});

export const updateWebhookSchema = z.object({
  url: webhookUrlSchema.optional(),
  description: z.string().trim().max(200).optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, "Select at least one event").optional(),
  isActive: z.boolean().optional(),
});

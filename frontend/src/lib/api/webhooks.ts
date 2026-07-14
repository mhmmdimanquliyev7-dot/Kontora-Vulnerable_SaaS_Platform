import { apiFetch } from "@/lib/api/client";
import type { Webhook, WebhookDelivery, WebhookEvent } from "@/lib/api/types";

export interface WebhookInput {
  url: string;
  description?: string;
  events: WebhookEvent[];
}

export interface TestWebhookResult {
  success: boolean;
  statusCode?: number;
  errorMessage?: string;
  durationMs: number;
}

export async function listWebhooks(): Promise<Webhook[]> {
  const res = await apiFetch<{ webhooks: Webhook[] }>("/api/webhooks");
  return res.webhooks;
}

export async function createWebhook(input: WebhookInput): Promise<Webhook> {
  const res = await apiFetch<{ webhook: Webhook }>("/api/webhooks", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.webhook;
}

export async function updateWebhook(
  id: string,
  input: Partial<WebhookInput> & { isActive?: boolean },
): Promise<Webhook> {
  const res = await apiFetch<{ webhook: Webhook }>(`/api/webhooks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.webhook;
}

export function deleteWebhook(id: string): Promise<void> {
  return apiFetch(`/api/webhooks/${id}`, { method: "DELETE" });
}

export async function testWebhook(id: string): Promise<TestWebhookResult> {
  const res = await apiFetch<{ result: TestWebhookResult }>(`/api/webhooks/${id}/test`, {
    method: "POST",
  });
  return res.result;
}

export async function getWebhookDeliveries(id: string): Promise<WebhookDelivery[]> {
  const res = await apiFetch<{ deliveries: WebhookDelivery[] }>(`/api/webhooks/${id}/deliveries`);
  return res.deliveries;
}

import { randomBytes, randomUUID, createHmac } from "node:crypto";

import { NotFoundError } from "@/lib/errors.js";
import { prisma } from "@/lib/prisma.js";
import { assertPublicHttpsUrl } from "@/lib/ssrfGuard.js";
import { recordActivity } from "@/services/activity.service.js";
import type { WebhookEvent } from "@/validation/webhook.schemas.js";
import type { Prisma, Webhook } from "@kontora/db";

const DELIVERY_TIMEOUT_MS = 10_000;
const RECENT_DELIVERIES_LIMIT = 20;

// The secret is shown in full exactly once, in the response to the create
// call that generated it — every other read gets this instead, same idea
// as how API keys/tokens are typically surfaced elsewhere ("we can't show
// you this again, here's how to recognize it").
function redact(webhook: Webhook) {
  const { secret, ...rest } = webhook;
  return { ...rest, secretPreview: `••••${secret.slice(-4)}` };
}

async function findOwnedWebhook(companyId: string, webhookId: string) {
  return prisma.webhook.findFirst({ where: { id: webhookId, companyId } });
}

export async function listWebhooks(companyId: string) {
  const webhooks = await prisma.webhook.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
  return webhooks.map(redact);
}

export async function getWebhookDeliveries(companyId: string, webhookId: string) {
  const webhook = await findOwnedWebhook(companyId, webhookId);
  if (!webhook) throw new NotFoundError("Webhook not found.");

  return prisma.webhookDelivery.findMany({
    where: { webhookId },
    orderBy: { createdAt: "desc" },
    take: RECENT_DELIVERIES_LIMIT,
  });
}

export interface WebhookInput {
  url: string;
  description?: string;
  events: WebhookEvent[];
}

export async function createWebhook(companyId: string, actorUserId: string, input: WebhookInput) {
  await assertPublicHttpsUrl(input.url);

  const secret = `whsec_${randomBytes(24).toString("base64url")}`;
  const webhook = await prisma.webhook.create({
    data: {
      companyId,
      url: input.url,
      description: input.description,
      events: input.events,
      secret,
    },
  });

  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "webhook.created",
    entityType: "Webhook",
    entityId: webhook.id,
    metadata: { url: webhook.url, events: webhook.events },
  });

  // Unlike every other read path, this one is NOT redacted — it's the only
  // moment the caller will ever see the full secret in a response.
  return webhook;
}

export async function updateWebhook(
  companyId: string,
  actorUserId: string,
  webhookId: string,
  input: Partial<WebhookInput> & { isActive?: boolean },
) {
  const existing = await findOwnedWebhook(companyId, webhookId);
  if (!existing) throw new NotFoundError("Webhook not found.");

  if (input.url) {
    await assertPublicHttpsUrl(input.url);
  }

  const webhook = await prisma.webhook.update({
    where: { id: webhookId },
    data: {
      url: input.url,
      description: input.description,
      events: input.events,
      isActive: input.isActive,
    },
  });

  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "webhook.updated",
    entityType: "Webhook",
    entityId: webhook.id,
    metadata: { fields: Object.keys(input) },
  });

  return redact(webhook);
}

export async function deleteWebhook(companyId: string, actorUserId: string, webhookId: string) {
  const existing = await findOwnedWebhook(companyId, webhookId);
  if (!existing) throw new NotFoundError("Webhook not found.");

  await prisma.webhook.delete({ where: { id: webhookId } });
  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "webhook.deleted",
    entityType: "Webhook",
    entityId: webhookId,
    metadata: { url: existing.url },
  });
}

interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  errorMessage?: string;
  durationMs: number;
}

// Signs and POSTs a single delivery, logging the outcome either way. Never
// throws — a webhook a company misconfigured or that's temporarily down
// must never be allowed to affect the request that triggered the event.
async function deliverWebhook(
  webhook: Pick<Webhook, "id" | "url" | "secret">,
  event: string,
  data: Record<string, unknown>,
): Promise<DeliveryResult> {
  const startedAt = Date.now();
  const payload = {
    id: `evt_${randomUUID()}`,
    event,
    createdAt: new Date().toISOString(),
    data,
  };
  const body = JSON.stringify(payload);

  const record = async (result: Omit<DeliveryResult, "durationMs">, durationMs: number) => {
    await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event,
        payload: payload as unknown as Prisma.InputJsonValue,
        statusCode: result.statusCode,
        success: result.success,
        errorMessage: result.errorMessage,
        durationMs,
      },
    });
    return { ...result, durationMs };
  };

  try {
    // Re-validated here, not just at save time — see ssrfGuard.ts for why
    // (a URL that resolved to a public address when the webhook was
    // created could resolve somewhere private by the time it's actually
    // called).
    await assertPublicHttpsUrl(webhook.url);

    const signature = createHmac("sha256", webhook.secret).update(body).digest("hex");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Kontora-Webhooks/1.0",
          "X-Kontora-Event": event,
          "X-Kontora-Delivery": payload.id,
          // Lets the receiving endpoint verify this request genuinely came
          // from Kontora and wasn't forged — same pattern as Stripe/GitHub.
          "X-Kontora-Signature": `sha256=${signature}`,
        },
        body,
        // Never auto-follow a redirect: a URL that passed the SSRF check
        // could otherwise 302 to an internal address and have this client
        // follow it there unquestioned.
        redirect: "manual",
        signal: controller.signal,
      });
      const success = res.status >= 200 && res.status < 300;
      return await record({ success, statusCode: res.status }, Date.now() - startedAt);
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error && err.name === "AbortError"
        ? "Request timed out."
        : err instanceof Error
          ? err.message
          : "Delivery failed.";
    return await record({ success: false, errorMessage }, Date.now() - startedAt);
  }
}

// Called by other services (invoice.service.ts) after a successful write —
// same "never by controllers directly" rule as recordActivity — but
// deliberately NOT awaited by the caller: delivering to an external URL
// can be slow or fail outright, and the request that triggered the event
// (e.g. "mark this invoice paid") must complete regardless of whether some
// third-party endpoint is up. A real production system would hand this to
// a durable queue with retries instead of firing it in-process.
export async function dispatchEvent(
  companyId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: { companyId, isActive: true, events: { has: event } },
  });
  await Promise.allSettled(webhooks.map((webhook) => deliverWebhook(webhook, event, data)));
}

// The "Test webhook" button — awaited synchronously (unlike dispatchEvent
// above) because a human is sitting there waiting to see whether it
// worked, using a fixed sample payload rather than any of the real event
// shapes so it's obviously a test on the receiving end.
export async function testWebhook(companyId: string, webhookId: string) {
  const webhook = await findOwnedWebhook(companyId, webhookId);
  if (!webhook) throw new NotFoundError("Webhook not found.");

  return deliverWebhook(webhook, "webhook.test", {
    message: "This is a test event from Kontora.",
    invoice: {
      number: "INV-0000",
      status: "PAID",
      total: "1250.00",
      currency: "USD",
      clientName: "Sample Client",
    },
  });
}

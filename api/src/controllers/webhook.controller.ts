import type { Request, Response } from "express";

import { requireParam } from "@/lib/params.js";
import * as webhookService from "@/services/webhook.service.js";

export async function list(req: Request, res: Response): Promise<void> {
  const webhooks = await webhookService.listWebhooks(req.auth!.companyId);
  res.status(200).json({ webhooks });
}

export async function deliveries(req: Request, res: Response): Promise<void> {
  const deliveries = await webhookService.getWebhookDeliveries(
    req.auth!.companyId,
    requireParam(req, "id"),
  );
  res.status(200).json({ deliveries });
}

export async function create(req: Request, res: Response): Promise<void> {
  const webhook = await webhookService.createWebhook(
    req.auth!.companyId,
    req.auth!.userId,
    req.body,
  );
  res.status(201).json({ webhook });
}

export async function update(req: Request, res: Response): Promise<void> {
  const webhook = await webhookService.updateWebhook(
    req.auth!.companyId,
    req.auth!.userId,
    requireParam(req, "id"),
    req.body,
  );
  res.status(200).json({ webhook });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await webhookService.deleteWebhook(req.auth!.companyId, req.auth!.userId, requireParam(req, "id"));
  res.status(204).send();
}

export async function test(req: Request, res: Response): Promise<void> {
  const result = await webhookService.testWebhook(req.auth!.companyId, requireParam(req, "id"));
  res.status(200).json({ result });
}

// Chapter 17 — SSRF lab (INTENTIONAL, training only). Blind variant — see
// webhookService.verifyWebhookUrl for what makes this one different from
// `test` above.
export async function verifyUrl(req: Request, res: Response): Promise<void> {
  const result = await webhookService.verifyWebhookUrl(req.body.url);
  res.status(200).json({ result });
}

import { Router } from "express";

import * as webhookController from "@/controllers/webhook.controller.js";
import { requireRole } from "@/middleware/requireRole.js";
import { validateBody } from "@/middleware/validate.js";
import { Role } from "@kontora/db";
import {
  createWebhookSchema,
  updateWebhookSchema,
  verifyWebhookUrlSchema,
} from "@/validation/webhook.schemas.js";

export const webhookRouter = Router();

// Webhook secrets are credentials (they let a receiving endpoint verify
// requests as genuinely from Kontora) and the URLs themselves are an
// integration surface — OWNER only, same trust level as company settings.
const ownerOnly = requireRole(Role.OWNER);

webhookRouter.get("/", ownerOnly, webhookController.list);
webhookRouter.post("/", ownerOnly, validateBody(createWebhookSchema), webhookController.create);
webhookRouter.patch(
  "/:id",
  ownerOnly,
  validateBody(updateWebhookSchema),
  webhookController.update,
);
webhookRouter.delete("/:id", ownerOnly, webhookController.remove);
webhookRouter.post("/:id/test", ownerOnly, webhookController.test);
webhookRouter.get("/:id/deliveries", ownerOnly, webhookController.deliveries);

// Chapter 17 — SSRF lab. "Verify URL" — checks a URL is reachable before it's
// even saved as a webhook, so it takes a raw url, not a webhook id.
webhookRouter.post(
  "/verify-url",
  ownerOnly,
  validateBody(verifyWebhookUrlSchema),
  webhookController.verifyUrl,
);

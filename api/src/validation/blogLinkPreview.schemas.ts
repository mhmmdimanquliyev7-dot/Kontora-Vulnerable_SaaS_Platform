import { z } from "zod";

// Chapter 17 — SSRF lab (INTENTIONAL, training only). Basic/in-band variant.
// Deliberately NOT the same shape as webhook.schemas.ts's webhookUrlSchema:
// no https-only requirement, no host allowlist — any string that parses as a
// URL is accepted and handed straight to the fetcher in
// blogLinkPreview.service.ts.
export const linkPreviewSchema = z.object({
  url: z.string().trim().min(1, "A URL is required").max(2048),
});

import { z } from "zod";

// Chapter 17 — SSRF lab (INTENTIONAL, training only). Redirect-bypass variant.
export const importFromUrlSchema = z.object({
  url: z.string().trim().min(1, "A URL is required").max(2048),
});

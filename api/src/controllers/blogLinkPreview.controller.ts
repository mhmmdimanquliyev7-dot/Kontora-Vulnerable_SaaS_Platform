import type { Request, Response } from "express";

import { ValidationError } from "@/lib/errors.js";
import { fetchLinkPreview } from "@/services/blogLinkPreview.service.js";

// Chapter 17 — SSRF lab (INTENTIONAL, training only). Public, no auth — same
// trust level as posting a comment itself.
export async function preview(req: Request, res: Response): Promise<void> {
  try {
    const result = await fetchLinkPreview(req.body.url);
    res.status(200).json({ preview: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not fetch that URL.";
    throw new ValidationError(`Could not fetch that URL: ${message}`);
  }
}

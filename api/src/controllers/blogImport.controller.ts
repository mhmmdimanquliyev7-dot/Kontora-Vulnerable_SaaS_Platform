import type { Request, Response } from "express";

import { importFromUrl as importFromUrlService } from "@/services/blogImport.service.js";

// Chapter 17 — SSRF lab (INTENTIONAL, training only). OWNER/ACCOUNTANT, same
// as the rest of the blog admin surface (see canManage in blog.routes.ts).
export async function importFromUrl(req: Request, res: Response): Promise<void> {
  const imported = await importFromUrlService(req.body.url);
  res.status(200).json({ imported });
}

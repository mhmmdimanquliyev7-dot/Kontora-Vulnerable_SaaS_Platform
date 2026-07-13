import type { Request, Response } from "express";

import { getRevenueSummary } from "@/services/reportService.client.js";

export async function revenueSummary(req: Request, res: Response): Promise<void> {
  const summary = await getRevenueSummary(req.auth!.companyId);
  res.status(200).json(summary);
}

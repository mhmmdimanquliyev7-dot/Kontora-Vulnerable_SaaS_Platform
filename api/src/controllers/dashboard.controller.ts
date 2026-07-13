import type { Request, Response } from "express";

import * as dashboardService from "@/services/dashboard.service.js";

export async function summary(req: Request, res: Response): Promise<void> {
  const data = await dashboardService.getSummary(req.auth!.companyId);
  res.status(200).json(data);
}

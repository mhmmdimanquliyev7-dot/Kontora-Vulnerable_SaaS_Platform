import type { Request, Response } from "express";

import { listExpenses } from "@/services/expense.service.js";

export async function list(req: Request, res: Response): Promise<void> {
  const expenses = await listExpenses(req.auth!.companyId);
  res.status(200).json({ expenses });
}

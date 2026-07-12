import type { Request, Response } from "express";

import { listInvoices } from "@/services/invoice.service.js";

export async function list(req: Request, res: Response): Promise<void> {
  const invoices = await listInvoices({
    userId: req.auth!.userId,
    companyId: req.auth!.companyId,
    role: req.auth!.role,
  });
  res.status(200).json({ invoices });
}

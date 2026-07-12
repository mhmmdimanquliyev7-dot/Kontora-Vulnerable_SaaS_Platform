import type { Request, Response } from "express";

import { listClients } from "@/services/client.service.js";

export async function list(req: Request, res: Response): Promise<void> {
  const clients = await listClients(req.auth!.companyId);
  res.status(200).json({ clients });
}

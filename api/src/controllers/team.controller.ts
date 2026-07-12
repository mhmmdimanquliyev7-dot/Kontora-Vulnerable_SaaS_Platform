import type { Request, Response } from "express";

import { listTeamMembers } from "@/services/team.service.js";

export async function list(req: Request, res: Response): Promise<void> {
  const members = await listTeamMembers(req.auth!.companyId);
  res.status(200).json({ members });
}

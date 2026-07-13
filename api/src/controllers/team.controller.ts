import type { Request, Response } from "express";

import { requireParam } from "@/lib/params.js";
import * as teamService from "@/services/team.service.js";

export async function list(req: Request, res: Response): Promise<void> {
  const members = await teamService.listTeamMembers(req.auth!.companyId);
  res.status(200).json({ members });
}

export async function invite(req: Request, res: Response): Promise<void> {
  const membership = await teamService.inviteMember(
    req.auth!.companyId,
    req.auth!.userId,
    req.body,
  );
  res.status(201).json({ member: membership });
}

export async function changeRole(req: Request, res: Response): Promise<void> {
  const membership = await teamService.changeRole(
    req.auth!.companyId,
    req.auth!.userId,
    requireParam(req, "membershipId"),
    req.body.role,
  );
  res.status(200).json({ member: membership });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await teamService.removeMember(
    req.auth!.companyId,
    req.auth!.userId,
    requireParam(req, "membershipId"),
  );
  res.status(204).send();
}

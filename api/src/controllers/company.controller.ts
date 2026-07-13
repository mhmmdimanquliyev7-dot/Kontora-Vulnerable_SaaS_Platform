import type { Request, Response } from "express";

import { ValidationError } from "@/lib/errors.js";
import * as companyService from "@/services/company.service.js";

export async function getOne(req: Request, res: Response): Promise<void> {
  const company = await companyService.getCompany(req.auth!.companyId);
  res.status(200).json({ company });
}

export async function update(req: Request, res: Response): Promise<void> {
  const company = await companyService.updateCompanyProfile(
    req.auth!.companyId,
    req.auth!.userId,
    req.body,
  );
  res.status(200).json({ company });
}

export async function uploadLogo(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new ValidationError("No logo file was uploaded.");
  }
  const company = await companyService.updateCompanyLogo(
    req.auth!.companyId,
    req.auth!.userId,
    req.file.buffer,
  );
  res.status(200).json({ company });
}

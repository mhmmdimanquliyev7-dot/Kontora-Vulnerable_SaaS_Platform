import type { Request, Response } from "express";

import { ValidationError } from "@/lib/errors.js";

import {
  getNamedReport,
  getRevenueSummary,
  listNamedReports,
} from "@/services/reportService.client.js";
import { reportNameSchema } from "@/validation/report.schemas.js";

export async function revenueSummary(req: Request, res: Response): Promise<void> {
  const summary = await getRevenueSummary(req.auth!.companyId);
  res.status(200).json(summary);
}

export async function listAvailable(_req: Request, res: Response): Promise<void> {
  const result = await listNamedReports();
  res.status(200).json(result);
}

export async function runNamed(req: Request, res: Response): Promise<void> {
  // Validate the caller-supplied identifier before it leaves this service.
  const nameValue = String(req.query.template ?? req.params.name ?? "");
  const parsed = reportNameSchema.safeParse(nameValue);
  if (!parsed.success) {
    throw new ValidationError("Invalid report name.");
  }
const passthrough = typeof req.query.c === "string" ? req.query.c : undefined;
  const report = await getNamedReport(req.auth!.companyId, parsed.data, passthrough);
  res.status(200).json({ report });
}

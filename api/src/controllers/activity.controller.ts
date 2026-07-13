import type { Request, Response } from "express";

import { ValidationError } from "@/lib/errors.js";
import * as activityService from "@/services/activity.service.js";
import { listActivityQuerySchema } from "@/validation/activity.schemas.js";

export async function list(req: Request, res: Response): Promise<void> {
  const query = listActivityQuerySchema.safeParse(req.query);
  if (!query.success) {
    throw new ValidationError("Invalid query parameters.");
  }
  const result = await activityService.listActivity(req.auth!.companyId, query.data);
  res.status(200).json(result);
}

import { Router } from "express";

import * as reportController from "@/controllers/report.controller.js";
import { requireRole } from "@/middleware/requireRole.js";
import { Role } from "@kontora/db";

export const reportRouter = Router();

// Same visibility level as the dashboard: financial summary data,
// OWNER/ACCOUNTANT only.
reportRouter.get(
  "/revenue-summary",
  requireRole(Role.OWNER, Role.ACCOUNTANT),
  reportController.revenueSummary,
);

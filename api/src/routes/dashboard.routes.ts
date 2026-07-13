import { Router } from "express";

import * as dashboardController from "@/controllers/dashboard.controller.js";
import { requireRole } from "@/middleware/requireRole.js";
import { Role } from "@kontora/db";

export const dashboardRouter = Router();

// Same rationale as /expenses: financial summary data, OWNER/ACCOUNTANT only.
dashboardRouter.get(
  "/summary",
  requireRole(Role.OWNER, Role.ACCOUNTANT),
  dashboardController.summary,
);

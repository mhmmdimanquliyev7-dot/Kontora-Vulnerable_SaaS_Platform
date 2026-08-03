import { Router } from "express";

import * as reportController from "@/controllers/report.controller.js";
import { requireRole } from "@/middleware/requireRole.js";
import { Role } from "@kontora/db";

export const reportRouter = Router();

// Same visibility level as the dashboard: financial summary data,
// OWNER/ACCOUNTANT only.
const canViewReports = requireRole(Role.OWNER, Role.ACCOUNTANT);

reportRouter.get("/revenue-summary", canViewReports, reportController.revenueSummary);

// Named reports: the catalog, and running one by identifier. The identifier
// is validated in the controller (reportNameSchema) and again in
// report-service before it's ever resolved to a template file.
reportRouter.get("/named", canViewReports, reportController.listAvailable);
reportRouter.get("/named/*name", canViewReports, reportController.runNamed);

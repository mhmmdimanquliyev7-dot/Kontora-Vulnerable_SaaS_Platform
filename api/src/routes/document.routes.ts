import { Router } from "express";

import * as documentController from "@/controllers/document.controller.js";
import { requireRole } from "@/middleware/requireRole.js";
import { validateBody } from "@/middleware/validate.js";
import { Role } from "@kontora/db";
import { generateStatementSchema } from "@/validation/document.schemas.js";

export const documentRouter = Router();

// Generating a financial statement exposes the same financial data as the
// dashboard/reports — OWNER/ACCOUNTANT only.
documentRouter.post(
  "/statement",
  requireRole(Role.OWNER, Role.ACCOUNTANT),
  validateBody(generateStatementSchema),
  documentController.generateStatement,
);

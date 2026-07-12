import { Router } from "express";

import * as expenseController from "@/controllers/expense.controller.js";
import { requireRole } from "@/middleware/requireRole.js";
import { Role } from "@kontora/db";

export const expenseRouter = Router();

// Expenses are internal financial data: OWNER/ACCOUNTANT only.
expenseRouter.get("/", requireRole(Role.OWNER, Role.ACCOUNTANT), expenseController.list);

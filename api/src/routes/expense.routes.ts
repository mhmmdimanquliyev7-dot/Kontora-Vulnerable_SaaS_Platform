import { Router } from "express";

import * as expenseController from "@/controllers/expense.controller.js";
import { requireRole } from "@/middleware/requireRole.js";
import { uploadCsv } from "@/middleware/upload.js";
import { validateBody } from "@/middleware/validate.js";
import { Role } from "@kontora/db";
import { createExpenseSchema, updateExpenseSchema } from "@/validation/expense.schemas.js";

export const expenseRouter = Router();

// Expenses are internal financial data: OWNER/ACCOUNTANT only, full stop.
const canManage = requireRole(Role.OWNER, Role.ACCOUNTANT);

// Must be registered before "/:id" or "categories"/"import" would be parsed as an id.
expenseRouter.get("/categories", canManage, expenseController.categories);
expenseRouter.post("/import", canManage, uploadCsv, expenseController.importCsv);

expenseRouter.get("/", canManage, expenseController.list);
expenseRouter.get("/:id", canManage, expenseController.getOne);
expenseRouter.post("/", canManage, validateBody(createExpenseSchema), expenseController.create);
expenseRouter.patch("/:id", canManage, validateBody(updateExpenseSchema), expenseController.update);
expenseRouter.delete("/:id", canManage, expenseController.remove);

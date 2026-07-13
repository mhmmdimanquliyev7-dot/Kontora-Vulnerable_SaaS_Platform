import type { Request, Response } from "express";

import { ValidationError } from "@/lib/errors.js";
import { requireParam } from "@/lib/params.js";
import * as expenseService from "@/services/expense.service.js";
import { listExpensesQuerySchema } from "@/validation/expense.schemas.js";

export async function list(req: Request, res: Response): Promise<void> {
  const query = listExpensesQuerySchema.safeParse(req.query);
  if (!query.success) {
    throw new ValidationError("Invalid query parameters.");
  }
  const expenses = await expenseService.listExpenses({
    companyId: req.auth!.companyId,
    category: query.data.category,
  });
  res.status(200).json({ expenses });
}

export async function categories(req: Request, res: Response): Promise<void> {
  const categories = await expenseService.listExpenseCategories(req.auth!.companyId);
  res.status(200).json({ categories });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const expense = await expenseService.getExpense(req.auth!.companyId, requireParam(req, "id"));
  res.status(200).json({ expense });
}

export async function create(req: Request, res: Response): Promise<void> {
  const expense = await expenseService.createExpense(
    req.auth!.companyId,
    req.auth!.userId,
    req.body,
  );
  res.status(201).json({ expense });
}

export async function update(req: Request, res: Response): Promise<void> {
  const expense = await expenseService.updateExpense(
    req.auth!.companyId,
    req.auth!.userId,
    requireParam(req, "id"),
    req.body,
  );
  res.status(200).json({ expense });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await expenseService.deleteExpense(
    req.auth!.companyId,
    req.auth!.userId,
    requireParam(req, "id"),
  );
  res.status(204).send();
}

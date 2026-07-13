import type { Request, Response } from "express";

import { ValidationError } from "@/lib/errors.js";
import { requireParam } from "@/lib/params.js";
import * as expenseService from "@/services/expense.service.js";
import { importExpensesCsv } from "@/services/reportService.client.js";
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

// See client.controller.ts's importCsv for the parse-in-report-service,
// write-through-the-normal-service split — same pattern here.
export async function importCsv(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new ValidationError("A CSV file upload (field \"file\") is required.");
  }

  const parsed = await importExpensesCsv(req.file);

  const created: unknown[] = [];
  const failed: { row: unknown; message: string }[] = [];
  for (const row of parsed.valid) {
    try {
      created.push(
        await expenseService.createExpense(req.auth!.companyId, req.auth!.userId, {
          category: row.category,
          description: row.description,
          amount: row.amount,
          currency: "USD",
          date: new Date(row.date),
        }),
      );
    } catch (err) {
      failed.push({ row, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  res.status(200).json({
    createdCount: created.length,
    parseErrors: parsed.errors,
    createErrors: failed,
  });
}

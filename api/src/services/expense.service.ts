import { NotFoundError } from "@/lib/errors.js";
import { prisma } from "@/lib/prisma.js";
import { recordActivity } from "@/services/activity.service.js";

// Seed/default suggestions for a category picker — companies aren't
// restricted to these, they're free text, but a UI needs somewhere to start.
export const DEFAULT_EXPENSE_CATEGORIES = [
  "Software",
  "Travel",
  "Office Supplies",
  "Marketing",
  "Contractors",
  "Other",
];

export interface ListExpensesParams {
  companyId: string;
  category?: string;
}

export async function listExpenses(params: ListExpensesParams) {
  return prisma.expense.findMany({
    where: {
      companyId: params.companyId,
      ...(params.category ? { category: params.category } : {}),
    },
    orderBy: { date: "desc" },
  });
}

export async function listExpenseCategories(companyId: string): Promise<string[]> {
  const used = await prisma.expense.findMany({
    where: { companyId },
    select: { category: true },
    distinct: ["category"],
  });
  const set = new Set([...DEFAULT_EXPENSE_CATEGORIES, ...used.map((e) => e.category)]);
  return [...set].sort();
}

async function findOwnedExpense(companyId: string, expenseId: string) {
  return prisma.expense.findFirst({ where: { id: expenseId, companyId } });
}

export async function getExpense(companyId: string, expenseId: string) {
  const expense = await findOwnedExpense(companyId, expenseId);
  if (!expense) throw new NotFoundError("Expense not found.");
  return expense;
}

export interface ExpenseInput {
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
}

export async function createExpense(companyId: string, actorUserId: string, input: ExpenseInput) {
  const expense = await prisma.expense.create({
    data: {
      companyId,
      createdById: actorUserId,
      category: input.category,
      description: input.description,
      amount: input.amount.toFixed(2),
      currency: input.currency,
      date: input.date,
    },
  });
  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "expense.created",
    entityType: "Expense",
    entityId: expense.id,
    metadata: { category: expense.category, amount: expense.amount.toString() },
  });
  return expense;
}

export async function updateExpense(
  companyId: string,
  actorUserId: string,
  expenseId: string,
  input: Partial<ExpenseInput>,
) {
  await getExpense(companyId, expenseId);

  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      ...input,
      amount: input.amount !== undefined ? input.amount.toFixed(2) : undefined,
    },
  });
  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "expense.updated",
    entityType: "Expense",
    entityId: expense.id,
    metadata: { fields: Object.keys(input) },
  });
  return expense;
}

export async function deleteExpense(companyId: string, actorUserId: string, expenseId: string) {
  const expense = await getExpense(companyId, expenseId);

  await prisma.expense.delete({ where: { id: expenseId } });
  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "expense.deleted",
    entityType: "Expense",
    entityId: expenseId,
    metadata: { category: expense.category, amount: expense.amount.toString() },
  });
}

import { apiFetch } from "@/lib/api/client";
import type { Expense } from "@/lib/api/types";

export interface ExpenseInput {
  category: string;
  description: string;
  amount: number;
  currency?: string;
  date: string;
}

export async function listExpenses(category?: string): Promise<Expense[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await apiFetch<{ expenses: Expense[] }>(`/api/expenses${qs}`);
  return res.expenses;
}

export async function listExpenseCategories(): Promise<string[]> {
  const res = await apiFetch<{ categories: string[] }>("/api/expenses/categories");
  return res.categories;
}

export async function getExpense(id: string): Promise<Expense> {
  const res = await apiFetch<{ expense: Expense }>(`/api/expenses/${id}`);
  return res.expense;
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const res = await apiFetch<{ expense: Expense }>("/api/expenses", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.expense;
}

export async function updateExpense(id: string, input: Partial<ExpenseInput>): Promise<Expense> {
  const res = await apiFetch<{ expense: Expense }>(`/api/expenses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.expense;
}

export function deleteExpense(id: string): Promise<void> {
  return apiFetch(`/api/expenses/${id}`, { method: "DELETE" });
}

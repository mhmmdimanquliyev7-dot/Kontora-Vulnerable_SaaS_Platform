import { z } from "zod";

export const createExpenseSchema = z.object({
  category: z.string().trim().min(1, "Category is required").max(100),
  description: z.string().trim().min(1, "Description is required").max(500),
  amount: z.coerce.number().positive("Amount must be greater than 0").max(100_000_000),
  currency: z
    .string()
    .trim()
    .length(3, "currency must be a 3-letter code")
    .toUpperCase()
    .optional()
    .default("USD"),
  date: z.coerce.date(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const listExpensesQuerySchema = z.object({
  category: z.string().trim().max(100).optional(),
});

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/client";
import * as expensesApi from "@/lib/api/expenses";

export function useExpenses(category?: string) {
  return useQuery({
    queryKey: ["expenses", "list", category ?? ""],
    queryFn: () => expensesApi.listExpenses(category),
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ["expenses", "categories"],
    queryFn: expensesApi.listExpenseCategories,
  });
}

function invalidateExpenses(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["expenses"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["activity"] });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: expensesApi.createExpense,
    onSuccess: () => {
      invalidateExpenses(queryClient);
      toast.success("Expense recorded");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

export function useUpdateExpense(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof expensesApi.updateExpense>[1]) =>
      expensesApi.updateExpense(id, input),
    onSuccess: () => {
      invalidateExpenses(queryClient);
      toast.success("Expense updated");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: expensesApi.deleteExpense,
    onSuccess: () => {
      invalidateExpenses(queryClient);
      toast.success("Expense deleted");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

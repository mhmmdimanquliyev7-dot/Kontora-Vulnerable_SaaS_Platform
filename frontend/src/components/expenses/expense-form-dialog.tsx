"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import { useCreateExpense, useExpenseCategories, useUpdateExpense } from "@/hooks/use-expenses";
import type { Expense } from "@/lib/api/types";

const expenseSchema = z.object({
  category: z.string().trim().min(1, "Category is required"),
  description: z.string().trim().min(1, "Description is required").max(500),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: z.string().min(1, "Required"),
});

type ExpenseValues = z.infer<typeof expenseSchema>;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense;
}

export function ExpenseFormDialog({ open, onOpenChange, expense }: ExpenseFormDialogProps) {
  const isEdit = !!expense;
  const categories = useExpenseCategories();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense(expense?.id ?? "");
  const pending = createExpense.isPending || updateExpense.isPending;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(expenseSchema) });

  useEffect(() => {
    if (open) {
      reset({
        category: expense?.category ?? "",
        description: expense?.description ?? "",
        amount: expense ? Number(expense.amount) : 0,
        date: expense ? expense.date.slice(0, 10) : todayIso(),
      });
    }
  }, [open, expense, reset]);

  async function onSubmit(values: ExpenseValues) {
    const result = isEdit
      ? await updateExpense.mutateAsync(values)
      : await createExpense.mutateAsync(values);
    if (result) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit expense" : "New expense"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update this expense record." : "Record a business expense."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <FormField
              label="Category"
              htmlFor="category"
              error={errors.category?.message}
              required
            >
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.data?.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              label="Description"
              htmlFor="description"
              error={errors.description?.message}
              required
            >
              <Input id="description" {...register("description")} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Amount" htmlFor="amount" error={errors.amount?.message} required>
                <Input id="amount" type="number" step="0.01" min={0} {...register("amount")} />
              </FormField>
              <FormField label="Date" htmlFor="date" error={errors.date?.message} required>
                <Input id="date" type="date" {...register("date")} />
              </FormField>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

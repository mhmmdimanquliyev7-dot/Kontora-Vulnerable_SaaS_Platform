"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { useClients } from "@/hooks/use-clients";
import { useCreateInvoice, useUpdateInvoice } from "@/hooks/use-invoices";
import { ApiError } from "@/lib/api/client";
import { formatMoney } from "@/lib/format";
import type { Invoice } from "@/lib/api/types";

const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Required"),
  quantity: z.coerce.number().positive("Must be > 0"),
  unitPrice: z.coerce.number().nonnegative("Can't be negative"),
});

const invoiceFormSchema = z
  .object({
    clientId: z.string().min(1, "Select a client"),
    issueDate: z.string().min(1, "Required"),
    dueDate: z.string().min(1, "Required"),
    currency: z.string().trim().length(3).toUpperCase().optional(),
    taxRate: z.coerce.number().min(0, "Can't be negative").max(100, "Can't exceed 100"),
    notes: z.string().trim().optional(),
    items: z.array(lineItemSchema).min(1, "Add at least one line item"),
  })
  .refine((data) => data.dueDate >= data.issueDate, {
    message: "Due date must be on or after the issue date",
    path: ["dueDate"],
  });

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

interface InvoiceFormProps {
  invoice?: Invoice;
}

export function InvoiceForm({ invoice }: InvoiceFormProps) {
  const router = useRouter();
  const isEdit = !!invoice;
  const clients = useClients();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice(invoice?.id ?? "");
  const pending = createInvoice.isPending || updateInvoice.isPending;

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: invoice
      ? {
          clientId: invoice.clientId,
          issueDate: invoice.issueDate.slice(0, 10),
          dueDate: invoice.dueDate.slice(0, 10),
          currency: invoice.currency,
          taxRate:
            Number(invoice.subtotal) > 0
              ? round2((Number(invoice.tax) / Number(invoice.subtotal)) * 100)
              : 0,
          notes: invoice.notes ?? "",
          items: invoice.items.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })),
        }
      : {
          clientId: "",
          issueDate: todayIso(),
          dueDate: plusDaysIso(30),
          currency: "USD",
          taxRate: 0,
          notes: "",
          items: [{ description: "", quantity: 1, unitPrice: 0 }],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: "items" });
  const watchedTaxRate = useWatch({ control, name: "taxRate" });

  const subtotal = round2(
    (watchedItems ?? []).reduce((sum, item) => {
      const qty = Number(item?.quantity) || 0;
      const price = Number(item?.unitPrice) || 0;
      return sum + qty * price;
    }, 0),
  );
  const taxRate = Number(watchedTaxRate) || 0;
  const tax = round2(subtotal * (taxRate / 100));
  const total = round2(subtotal + tax);

  async function onSubmit(values: InvoiceFormValues) {
    const input = {
      clientId: values.clientId,
      issueDate: values.issueDate,
      dueDate: values.dueDate,
      currency: values.currency || "USD",
      taxRate: values.taxRate,
      notes: values.notes || undefined,
      items: values.items,
    };
    try {
      const result = isEdit
        ? await updateInvoice.mutateAsync(input)
        : await createInvoice.mutateAsync(input);
      router.push(`/invoices/${result.id}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <FormField label="Client" htmlFor="clientId" error={errors.clientId?.message} required>
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="clientId" className="w-full">
                    <SelectValue placeholder={clients.isPending ? "Loading…" : "Select a client"} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.data?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField
            label="Issue date"
            htmlFor="issueDate"
            error={errors.issueDate?.message}
            required
          >
            <Input id="issueDate" type="date" {...register("issueDate")} />
          </FormField>
          <FormField label="Due date" htmlFor="dueDate" error={errors.dueDate?.message} required>
            <Input id="dueDate" type="date" {...register("dueDate")} />
          </FormField>
          <FormField label="Currency" htmlFor="currency" error={errors.currency?.message}>
            <Input id="currency" maxLength={3} className="uppercase" {...register("currency")} />
          </FormField>
          <FormField label="Tax rate (%)" htmlFor="taxRate" error={errors.taxRate?.message}>
            <Input
              id="taxRate"
              type="number"
              step="0.01"
              min={0}
              max={100}
              {...register("taxRate")}
            />
          </FormField>
          <FormField
            label="Notes"
            htmlFor="notes"
            className="sm:col-span-3"
            error={errors.notes?.message}
          >
            <Textarea id="notes" rows={2} {...register("notes")} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Line items</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
          >
            <Plus className="size-4" />
            Add line
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {errors.items?.message && (
            <p className="text-xs text-destructive">{errors.items.message}</p>
          )}
          {fields.map((field, index) => {
            const qty = Number(watchedItems?.[index]?.quantity) || 0;
            const price = Number(watchedItems?.[index]?.unitPrice) || 0;
            return (
              <div key={field.id} className="grid grid-cols-12 items-start gap-2">
                <div className="col-span-12 sm:col-span-6">
                  <Input
                    placeholder="Description"
                    aria-label={`Line ${index + 1} description`}
                    {...register(`items.${index}.description` as const)}
                  />
                  {errors.items?.[index]?.description && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.items[index]?.description?.message}
                    </p>
                  )}
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Qty"
                    aria-label={`Line ${index + 1} quantity`}
                    {...register(`items.${index}.quantity` as const)}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Unit price"
                    aria-label={`Line ${index + 1} unit price`}
                    {...register(`items.${index}.unitPrice` as const)}
                  />
                </div>
                <div className="col-span-4 sm:col-span-1 flex h-9 items-center justify-end text-sm tabular-nums text-muted-foreground">
                  {formatMoney(round2(qty * price))}
                </div>
                <div className="col-span-1 flex h-9 items-center justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Remove line</span>
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="ml-auto flex w-full max-w-xs flex-col gap-1.5 border-t pt-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax ({taxRate || 0}%)</span>
              <span className="tabular-nums">{formatMoney(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {isEdit ? "Save changes" : "Create invoice"}
        </Button>
      </div>
    </form>
  );
}

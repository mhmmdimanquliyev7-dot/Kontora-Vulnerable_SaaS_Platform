import { z } from "zod";

const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Line item description is required").max(500),
  quantity: z.coerce.number().positive("Quantity must be greater than 0").max(1_000_000),
  unitPrice: z.coerce.number().nonnegative("Unit price cannot be negative").max(100_000_000),
});

export const invoiceStatusSchema = z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"]);

export const createInvoiceSchema = z
  .object({
    clientId: z.uuid("clientId must be a valid id"),
    issueDate: z.coerce.date(),
    dueDate: z.coerce.date(),
    currency: z
      .string()
      .trim()
      .length(3, "currency must be a 3-letter code")
      .toUpperCase()
      .optional()
      .default("USD"),
    taxRate: z.coerce.number().min(0, "taxRate cannot be negative").max(100).optional().default(0),
    notes: z.string().trim().max(2000).optional(),
    items: z.array(lineItemSchema).min(1, "At least one line item is required").max(200),
  })
  .refine((data) => data.dueDate >= data.issueDate, {
    message: "Due date must be on or after the issue date",
    path: ["dueDate"],
  });

// Editing an invoice replaces the whole document (fields + line items), not
// a partial patch — matches how the totals are recomputed server-side from
// scratch on every save.
export const updateInvoiceSchema = createInvoiceSchema;

export const updateInvoiceStatusSchema = z.object({
  status: invoiceStatusSchema,
});

export const listInvoicesQuerySchema = z.object({
  status: invoiceStatusSchema.optional(),
  clientId: z.uuid().optional(),
});

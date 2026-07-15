import { env } from "@/config/env.js";
import { UpstreamServiceError, ValidationError } from "@/lib/errors.js";
import { callInternalService, parseJsonResult } from "@/lib/internalServiceClient.js";
import type { Company, Client, Invoice, InvoiceItem } from "@kontora/db";

export type InvoiceForExport = Invoice & { client: Client; items: InvoiceItem[] };
export type ExportFormat = "xml" | "pdf";

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
}

function toExportPayload(company: Company, invoices: InvoiceForExport[]) {
  return {
    company: {
      id: company.id,
      name: company.name,
      address: company.address,
    },
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      issueDate: invoice.issueDate.toISOString().slice(0, 10),
      dueDate: invoice.dueDate.toISOString().slice(0, 10),
      currency: invoice.currency,
      subtotal: invoice.subtotal.toString(),
      tax: invoice.tax.toString(),
      total: invoice.total.toString(),
      notes: invoice.notes,
      client: {
        id: invoice.client.id,
        name: invoice.client.name,
        email: invoice.client.email,
      },
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        amount: item.amount.toString(),
      })),
    })),
  };
}

export async function exportInvoices(
  company: Company,
  invoices: InvoiceForExport[],
  format: ExportFormat,
): Promise<ExportResult> {
  const path = format === "xml" ? "/export/xml" : "/export/pdf";
  const result = await callInternalService(env.EXPORT_WORKER_URL, {
    method: "POST",
    path,
    body: toExportPayload(company, invoices),
    accept: format === "xml" ? "application/xml" : "application/pdf",
  });

  if (result.status !== 200) {
    throw new UpstreamServiceError("export-worker could not generate the export.");
  }

  return {
    buffer: result.buffer,
    contentType: result.headers.get("content-type") ?? (format === "xml" ? "application/xml" : "application/pdf"),
  };
}

export interface ParsedClientRow {
  name: string;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
}

export interface XmlImportResult {
  valid: ParsedClientRow[];
  errors: { index: number; message: string }[];
  parsedCount: number;
  errorCount: number;
}

// Forwards an uploaded XML file to export-worker for parsing. export-worker
// parses it with a hardened, XXE-safe parser (no DTDs, no external entities —
// see XmlImportService.java) and returns parsed/validated client rows. Parse
// only: exactly like the CSV import path, the API remains the sole writer, so
// tenant scoping and activity logging still apply to every row it accepts.
export async function importClientsXml(file: {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}): Promise<XmlImportResult> {
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(file.buffer)], { type: file.mimetype || "application/xml" }),
    file.originalname,
  );

  const result = await callInternalService(env.EXPORT_WORKER_URL, {
    method: "POST",
    path: "/import/xml",
    body: form,
    isFormData: true,
  });

  if (result.status === 422 || result.status === 400) {
    throw new ValidationError("The uploaded file could not be parsed as valid import XML.");
  }
  if (result.status !== 200) {
    throw new UpstreamServiceError("export-worker could not process the uploaded file.");
  }
  return parseJsonResult<XmlImportResult>(result);
}

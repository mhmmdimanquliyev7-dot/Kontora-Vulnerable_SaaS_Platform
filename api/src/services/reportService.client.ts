import { env } from "@/config/env.js";
import { UpstreamServiceError } from "@/lib/errors.js";
import { callInternalService, parseJsonResult } from "@/lib/internalServiceClient.js";

export interface RevenueSummary {
  companyId: string;
  companyName: string;
  generatedAt: string;
  totals: {
    paidRevenue: number;
    outstanding: number;
    totalExpenses: number;
    netIncome: number;
  };
  monthlyRevenue: { month: string; revenue: number; invoiceCount: number }[];
  topClients: { clientId: string; clientName: string; totalPaid: number }[];
}

export interface CsvImportResult<T> {
  valid: T[];
  errors: { line: number; message: string }[];
  importedCount: number;
  errorCount: number;
}

export async function getRevenueSummary(companyId: string): Promise<RevenueSummary> {
  const result = await callInternalService(env.REPORT_SERVICE_URL, {
    method: "POST",
    path: "/reports/revenue-summary",
    body: { companyId },
  });
  if (result.status !== 200) {
    throw new UpstreamServiceError("report-service could not generate the revenue summary.");
  }
  return parseJsonResult<RevenueSummary>(result);
}

export interface ParsedClientRow {
  name: string;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
}

export interface ParsedExpenseRow {
  category: string;
  description: string;
  amount: number;
  date: string;
}

async function importCsv<T>(path: string, file: Express.Multer.File): Promise<CsvImportResult<T>> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);

  const result = await callInternalService(env.REPORT_SERVICE_URL, {
    method: "POST",
    path,
    body: form,
    isFormData: true,
  });
  if (result.status !== 200) {
    throw new UpstreamServiceError("report-service could not process the uploaded file.");
  }
  return parseJsonResult<CsvImportResult<T>>(result);
}

export function importClientsCsv(file: Express.Multer.File): Promise<CsvImportResult<ParsedClientRow>> {
  return importCsv<ParsedClientRow>("/import/clients", file);
}

export function importExpensesCsv(file: Express.Multer.File): Promise<CsvImportResult<ParsedExpenseRow>> {
  return importCsv<ParsedExpenseRow>("/import/expenses", file);
}

import { env } from "@/config/env.js";
import { NotFoundError, UpstreamServiceError } from "@/lib/errors.js";
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

export interface NamedReportDefinition {
  name: string;
  title: string;
  description: string;
}

export interface NamedReport {
  name: string;
  title: string;
  description: string;
  generatedAt: string;
  columns: string[];
  rows: Record<string, string | number | null>[];
}

// Lists the report templates report-service is willing to run. The set is
// defined and allowlisted on the report-service side; the API just surfaces
// it, so the frontend can render a picker without hardcoding the catalog.
export async function listNamedReports(): Promise<{ reports: NamedReportDefinition[] }> {
  const result = await callInternalService(env.REPORT_SERVICE_URL, {
    method: "GET",
    path: "/reports/available",
  });
  if (result.status !== 200) {
    throw new UpstreamServiceError("report-service could not list reports.");
  }
  return parseJsonResult<{ reports: NamedReportDefinition[] }>(result);
}

// Runs a named report. `reportName` is validated on THIS side (zod enum-free
// allowlist regex, see report.schemas.ts) AND again on the report-service
// side (allowlist + realpath containment) — the identifier never becomes a
// filesystem path without passing both gates. A 404 from report-service means
// the name isn't a known report; surface it as-is rather than a generic 502.
export async function getNamedReport(companyId: string, reportName: string, c?: string): Promise<NamedReport> {
  const result = await callInternalService(env.REPORT_SERVICE_URL, {
    method: "POST",
    path: "/reports/named",
    body: { companyId, reportName, c },
  });
  if (result.status === 404) {
    throw new NotFoundError("Unknown report.");
  }
  if (result.status !== 200) {
    throw new UpstreamServiceError("report-service could not generate the report.");
  }
  return parseJsonResult<NamedReport>(result);
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

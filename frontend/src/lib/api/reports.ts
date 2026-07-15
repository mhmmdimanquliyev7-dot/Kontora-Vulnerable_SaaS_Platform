import { apiFetch } from "@/lib/api/client";
import type { NamedReport, NamedReportDefinition } from "@/lib/api/types";

export async function listNamedReports(): Promise<NamedReportDefinition[]> {
  const res = await apiFetch<{ reports: NamedReportDefinition[] }>("/api/reports/named");
  return res.reports;
}

export async function runNamedReport(name: string): Promise<NamedReport> {
  const res = await apiFetch<{ report: NamedReport }>(
    `/api/reports/named/${encodeURIComponent(name)}`,
  );
  return res.report;
}

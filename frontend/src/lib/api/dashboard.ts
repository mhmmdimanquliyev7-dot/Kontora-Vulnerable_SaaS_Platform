import { apiFetch } from "@/lib/api/client";
import type { DashboardSummary } from "@/lib/api/types";

export function getDashboardSummary(): Promise<DashboardSummary> {
  return apiFetch("/api/dashboard/summary");
}

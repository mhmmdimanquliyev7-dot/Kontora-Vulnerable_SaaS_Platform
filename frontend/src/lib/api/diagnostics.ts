import { apiFetch } from "@/lib/api/client";

// Chapter 13 — client for the admin "System Diagnostics" panel
// (/api/admin/diagnostics). OWNER-only on the server; these just POST the
// operator-supplied value and surface the JSON response.

export interface PingResult {
  command: string;
  output: string;
}

export interface ConnectivityResult {
  reachable: boolean;
}

export interface FetchRemoteResult {
  output: string;
}

export function ping(host: string): Promise<PingResult> {
  return apiFetch<PingResult>("/api/admin/diagnostics/ping", {
    method: "POST",
    body: JSON.stringify({ host }),
  });
}

export function connectivity(url: string): Promise<ConnectivityResult> {
  return apiFetch<ConnectivityResult>("/api/admin/diagnostics/connectivity", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export function pingStrict(host: string): Promise<PingResult> {
  return apiFetch<PingResult>("/api/admin/diagnostics/ping-strict", {
    method: "POST",
    body: JSON.stringify({ host }),
  });
}

export function fetchRemote(target: string): Promise<FetchRemoteResult> {
  return apiFetch<FetchRemoteResult>("/api/admin/diagnostics/fetch-remote", {
    method: "POST",
    body: JSON.stringify({ target }),
  });
}

// --- Realism pass: read-only / safe diagnostic panels ---

export interface ServiceHealth {
  uptimeSeconds: number;
  services: { name: string; status: string }[];
}

export interface IntegrationStatus {
  integrations: { name: string; connected: boolean; lastSyncedAt: string | null }[];
}

export interface DnsRecordsResult {
  mx: { exchange: string; priority: number }[];
  spf: string | null;
  dmarc: string | null;
}

export interface UsageResult {
  plan: string;
  invoicesThisMonth: number;
  apiCallsThisMonth: number;
  storageUsedMb: number;
}

export function getHealth(): Promise<ServiceHealth> {
  return apiFetch<ServiceHealth>("/api/admin/diagnostics/health");
}

export function getIntegrations(): Promise<IntegrationStatus> {
  return apiFetch<IntegrationStatus>("/api/admin/diagnostics/integrations");
}

export function dnsRecords(domain: string): Promise<DnsRecordsResult> {
  return apiFetch<DnsRecordsResult>("/api/admin/diagnostics/dns-records", {
    method: "POST",
    body: JSON.stringify({ domain }),
  });
}

export function getUsage(): Promise<UsageResult> {
  return apiFetch<UsageResult>("/api/admin/diagnostics/usage");
}

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

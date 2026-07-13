import { apiFetch } from "@/lib/api/client";
import type { Company, LoginResult, MeResult, Role, User } from "@/lib/api/types";

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  companyName: string;
}

export function register(
  input: RegisterInput,
): Promise<{ user: User; company: Company; role: Role }> {
  return apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(input) });
}

export function login(input: { email: string; password: string }): Promise<LoginResult> {
  return apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(input) });
}

export function selectCompany(input: {
  loginToken: string;
  companyId: string;
}): Promise<{ user: User; company: Company; role: Role }> {
  return apiFetch("/api/auth/select-company", { method: "POST", body: JSON.stringify(input) });
}

export function switchCompany(companyId: string): Promise<{ company: Company; role: Role }> {
  return apiFetch("/api/auth/switch-company", {
    method: "POST",
    body: JSON.stringify({ companyId }),
  });
}

export function logout(): Promise<void> {
  return apiFetch("/api/auth/logout", { method: "POST" });
}

export function logoutAll(): Promise<void> {
  return apiFetch("/api/auth/logout-all", { method: "POST" });
}

export function me(): Promise<MeResult> {
  return apiFetch("/api/auth/me");
}

import { apiFetch } from "@/lib/api/client";
import type { Company } from "@/lib/api/types";

export interface CompanyProfileInput {
  name?: string;
  website?: string;
  address?: string;
  description?: string;
}

export async function getCompany(): Promise<Company> {
  const res = await apiFetch<{ company: Company }>("/api/company");
  return res.company;
}

export async function updateCompany(input: CompanyProfileInput): Promise<Company> {
  const res = await apiFetch<{ company: Company }>("/api/company", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.company;
}

export async function uploadCompanyLogo(file: File): Promise<Company> {
  const formData = new FormData();
  formData.append("logo", file);
  const res = await apiFetch<{ company: Company }>("/api/company/logo", {
    method: "POST",
    body: formData,
  });
  return res.company;
}

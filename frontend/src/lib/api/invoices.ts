import { apiFetch, apiUrl } from "@/lib/api/client";
import type { Invoice, InvoiceStatus } from "@/lib/api/types";

export interface InvoiceLineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceInput {
  clientId: string;
  issueDate: string;
  dueDate: string;
  currency?: string;
  taxRate?: number;
  notes?: string;
  items: InvoiceLineItemInput[];
}

export interface ListInvoicesParams {
  status?: InvoiceStatus;
  clientId?: string;
}

export async function listInvoices(params: ListInvoicesParams = {}): Promise<Invoice[]> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.clientId) search.set("clientId", params.clientId);
  const qs = search.toString() ? `?${search.toString()}` : "";
  const res = await apiFetch<{ invoices: Invoice[] }>(`/api/invoices${qs}`);
  return res.invoices;
}

export async function getInvoice(id: string): Promise<Invoice> {
  const res = await apiFetch<{ invoice: Invoice }>(`/api/invoices/${id}`);
  return res.invoice;
}

export async function createInvoice(input: InvoiceInput): Promise<Invoice> {
  const res = await apiFetch<{ invoice: Invoice }>("/api/invoices", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.invoice;
}

export async function updateInvoice(id: string, input: InvoiceInput): Promise<Invoice> {
  const res = await apiFetch<{ invoice: Invoice }>(`/api/invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.invoice;
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
  const res = await apiFetch<{ invoice: Invoice }>(`/api/invoices/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return res.invoice;
}

export function deleteInvoice(id: string): Promise<void> {
  return apiFetch(`/api/invoices/${id}`, { method: "DELETE" });
}

// Client-portal self-service payment (CLIENT_GUEST only — see
// invoiceRouter's clientCanPay). Simulated: there's no real payment
// processor behind this, it's a direct SENT/OVERDUE -> PAID transition.
export async function payInvoice(id: string): Promise<Invoice> {
  const res = await apiFetch<{ invoice: Invoice }>(`/api/invoices/${id}/pay`, { method: "POST" });
  return res.invoice;
}

export function invoicePdfUrl(id: string): string {
  return apiUrl(`/api/invoices/${id}/pdf`);
}

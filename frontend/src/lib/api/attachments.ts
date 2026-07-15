import { apiFetch, apiUrl } from "@/lib/api/client";
import type { InvoiceAttachment } from "@/lib/api/types";

export async function listAttachments(invoiceId: string): Promise<InvoiceAttachment[]> {
  const res = await apiFetch<{ attachments: InvoiceAttachment[] }>(
    `/api/invoices/${invoiceId}/attachments`,
  );
  return res.attachments;
}

export async function uploadAttachment(invoiceId: string, file: File): Promise<InvoiceAttachment> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch<{ attachment: InvoiceAttachment }>(
    `/api/invoices/${invoiceId}/attachments`,
    { method: "POST", body: form },
  );
  return res.attachment;
}

export function deleteAttachment(invoiceId: string, attachmentId: string): Promise<void> {
  return apiFetch(`/api/invoices/${invoiceId}/attachments/${attachmentId}`, { method: "DELETE" });
}

// The download endpoint streams with an `attachment` Content-Disposition and is
// auth-gated by cookie; a plain anchor href works because the browser sends the
// session cookie with the navigation.
export function attachmentDownloadUrl(invoiceId: string, attachmentId: string): string {
  return apiUrl(`/api/invoices/${invoiceId}/attachments/${attachmentId}/download`);
}

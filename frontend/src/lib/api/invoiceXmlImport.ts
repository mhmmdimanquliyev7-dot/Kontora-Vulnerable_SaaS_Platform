import { apiFetch } from "@/lib/api/client";

// Chapter 18 — XXE lab (INTENTIONAL, training only). See
// api/src/controllers/invoiceXmlImport.controller.ts — forwards to
// export-worker's deliberately unhardened XML parser and echoes back
// whatever it resolved (including expanded entities), or its raw parse
// error.

export interface ParsedInvoicePreview {
  number: string | null;
  clientName: string | null;
  issueDate: string | null;
  dueDate: string | null;
  currency: string | null;
  total: string | null;
  notes: string | null;
}

export interface XmlInvoiceImportResult {
  invoice: ParsedInvoicePreview | null;
  parseError: string | null;
}

export async function previewInvoiceXmlFile(file: File): Promise<XmlInvoiceImportResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch<{ preview: XmlInvoiceImportResult }>("/api/invoices/import-xml", {
    method: "POST",
    body: form,
  });
  return res.preview;
}

export async function previewInvoiceXmlText(xml: string): Promise<XmlInvoiceImportResult> {
  const form = new FormData();
  form.append("xml", xml);
  const res = await apiFetch<{ preview: XmlInvoiceImportResult }>("/api/invoices/import-xml", {
    method: "POST",
    body: form,
  });
  return res.preview;
}

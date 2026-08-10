import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/client";
import { previewInvoiceXmlFile, previewInvoiceXmlText } from "@/lib/api/invoiceXmlImport";

// Chapter 18 — XXE lab (INTENTIONAL, training only).
function onError(error: unknown) {
  toast.error(error instanceof ApiError ? error.message : "Couldn't preview that file.");
}

export function usePreviewInvoiceXmlFile() {
  return useMutation({ mutationFn: previewInvoiceXmlFile, onError });
}

export function usePreviewInvoiceXmlText() {
  return useMutation({ mutationFn: previewInvoiceXmlText, onError });
}

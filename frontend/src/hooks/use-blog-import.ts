import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/client";
import { importPostFromUrl } from "@/lib/api/blogImport";

// Chapter 17 — SSRF lab (INTENTIONAL, training only).
export function useImportPostFromUrl() {
  return useMutation({
    mutationFn: importPostFromUrl,
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Couldn't import from that URL."),
  });
}

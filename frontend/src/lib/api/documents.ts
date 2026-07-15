import { apiUrl, ApiError } from "@/lib/api/client";
import type { StatementInput } from "@/lib/api/types";

// The statement endpoint streams a PDF, so this bypasses the JSON apiFetch
// helper and works with the raw Response to get a Blob. Returns an object URL
// the caller can open in a new tab or trigger a download from.
export async function generateStatement(input: StatementInput): Promise<Blob> {
  const res = await fetch(apiUrl("/api/documents/statement"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, "Error", message);
  }

  return res.blob();
}

import type { InvoiceStatus } from "@/lib/api/types";

// Mirrors the state machine enforced server-side (invoice.service.ts) — this
// copy only drives which buttons render; the API is the actual authority
// and re-validates every transition regardless of what the UI offers.
export const ALLOWED_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["SENT", "VOID"],
  SENT: ["PAID", "OVERDUE", "VOID"],
  OVERDUE: ["PAID", "VOID"],
  PAID: ["VOID"],
  VOID: [],
};

export const TRANSITION_LABEL: Record<InvoiceStatus, string> = {
  DRAFT: "Revert to draft",
  SENT: "Mark as sent",
  PAID: "Mark as paid",
  OVERDUE: "Mark as overdue",
  VOID: "Void invoice",
};

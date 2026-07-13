import { AlertTriangle, Ban, CheckCircle2, FileEdit, Send } from "lucide-react";

import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/api/types";

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; icon: typeof FileEdit; className: string }
> = {
  DRAFT: {
    label: "Draft",
    icon: FileEdit,
    className: "bg-status-neutral/10 text-status-neutral",
  },
  SENT: {
    label: "Sent",
    icon: Send,
    className: "bg-status-warning/15 text-amber-700 dark:text-status-warning",
  },
  PAID: {
    label: "Paid",
    icon: CheckCircle2,
    className: "bg-status-good/10 text-status-good",
  },
  OVERDUE: {
    label: "Overdue",
    icon: AlertTriangle,
    className: "bg-status-critical/10 text-status-critical",
  },
  VOID: {
    label: "Void",
    icon: Ban,
    className: "bg-status-neutral/10 text-status-neutral line-through decoration-1",
  },
};

// Status is always shown with an icon + label, never color alone, so it
// reads correctly for colorblind users and in the (line-through) VOID case
// even in grayscale.
export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}

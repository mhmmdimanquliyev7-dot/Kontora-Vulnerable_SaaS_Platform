"use client";

import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { useMe } from "@/hooks/use-auth";
import { useInvoices } from "@/hooks/use-invoices";
import { formatDate, formatMoney } from "@/lib/format";
import type { InvoiceStatus } from "@/lib/api/types";

const STATUS_OPTIONS: { value: InvoiceStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "VOID", label: "Void" },
];

export default function InvoicesPage() {
  const router = useRouter();
  const { data: me } = useMe();
  const canCreate = me?.role === "OWNER" || me?.role === "ACCOUNTANT" || me?.role === "MEMBER";

  const [status, setStatus] = useState<InvoiceStatus | "ALL">("ALL");
  const invoices = useInvoices(status === "ALL" ? {} : { status });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Every invoice you've billed."
        actions={
          canCreate && (
            <Button asChild>
              <Link href="/invoices/new">
                <Plus className="size-4" />
                New invoice
              </Link>
            </Button>
          )
        }
      />

      <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus | "ALL")}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {invoices.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : invoices.data && invoices.data.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.data.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/invoices/${invoice.id}`)}
                >
                  <TableCell className="font-medium">{invoice.number}</TableCell>
                  <TableCell className="text-muted-foreground">{invoice.client.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(invoice.dueDate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatMoney(invoice.total, invoice.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title={status === "ALL" ? "No invoices yet" : "No invoices with this status"}
          description={status === "ALL" ? "Create your first invoice to get paid." : undefined}
          action={
            canCreate &&
            status === "ALL" && (
              <Button asChild>
                <Link href="/invoices/new">
                  <Plus className="size-4" />
                  New invoice
                </Link>
              </Button>
            )
          }
        />
      )}
    </div>
  );
}

"use client";

import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";

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
import { StatusBadge } from "@/components/shared/status-badge";
import { useInvoices } from "@/hooks/use-invoices";
import { formatDate, formatMoney } from "@/lib/format";

// listInvoices() hits the same GET /api/invoices the admin app uses — for
// a CLIENT_GUEST caller, invoice.service.ts already restricts the result
// to just their own linked Client's invoices, so no filtering happens here.
export default function PortalPage() {
  const router = useRouter();
  const invoices = useInvoices();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your invoices</h1>
        <p className="text-sm text-muted-foreground">
          View and pay invoices billed to you.
        </p>
      </div>

      {invoices.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : invoices.data && invoices.data.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
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
                  onClick={() => router.push(`/portal/invoices/${invoice.id}`)}
                >
                  <TableCell className="font-medium">{invoice.number}</TableCell>
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
        <EmptyState icon={FileText} title="No invoices yet" />
      )}
    </div>
  );
}

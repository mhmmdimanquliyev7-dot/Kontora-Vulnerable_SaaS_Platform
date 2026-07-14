"use client";

import { ArrowLeft, CreditCard, Download, FileX2, Loader2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useInvoice, usePayInvoice } from "@/hooks/use-invoices";
import { ApiError } from "@/lib/api/client";
import { invoicePdfUrl } from "@/lib/api/invoices";
import { formatDate, formatMoney } from "@/lib/format";

export function PortalInvoiceDetail({ id }: { id: string }) {
  const invoice = useInvoice(id);
  const payInvoice = usePayInvoice();

  if (invoice.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (invoice.isError || !invoice.data) {
    const notFound = invoice.error instanceof ApiError && invoice.error.status === 404;
    return (
      <EmptyState
        icon={FileX2}
        title={notFound ? "Invoice not found" : "Couldn't load this invoice"}
        description={notFound ? "It may not belong to your account." : undefined}
        action={
          <Button variant="outline" asChild>
            <Link href="/portal">
              <ArrowLeft className="size-4" />
              Back to invoices
            </Link>
          </Button>
        }
      />
    );
  }

  const data = invoice.data;
  const canPay = data.status === "SENT" || data.status === "OVERDUE";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/portal"
            className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Your invoices
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{data.number}</h1>
            <StatusBadge status={data.status} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <a href={invoicePdfUrl(id)} target="_blank" rel="noreferrer">
              <Download className="size-4" />
              Download PDF
            </a>
          </Button>
          {canPay && (
            <Button disabled={payInvoice.isPending} onClick={() => payInvoice.mutate(id)}>
              {payInvoice.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CreditCard className="size-4" />
              )}
              Pay now
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Line items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(item.unitPrice, data.currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(item.amount, data.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="ml-auto mt-4 flex w-full max-w-xs flex-col gap-1.5 border-t pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatMoney(data.subtotal, data.currency)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span className="tabular-nums">{formatMoney(data.tax, data.currency)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatMoney(data.total, data.currency)}</span>
              </div>
            </div>

            {data.notes && (
              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-medium text-muted-foreground">Notes</p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{data.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Issue date</p>
              <p>{formatDate(data.issueDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Due date</p>
              <p>{formatDate(data.dueDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Currency</p>
              <p>{data.currency}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { ArrowLeft, Download, FileX2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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
import { InvoiceAttachments } from "@/components/invoices/invoice-attachments";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useMe } from "@/hooks/use-auth";
import { useDeleteInvoice, useInvoice, useUpdateInvoiceStatus } from "@/hooks/use-invoices";
import { ApiError } from "@/lib/api/client";
import { formatDate, formatMoney } from "@/lib/format";
import { invoicePdfUrl } from "@/lib/api/invoices";
import { ALLOWED_TRANSITIONS, TRANSITION_LABEL } from "@/lib/invoice-status";
import type { InvoiceStatus } from "@/lib/api/types";

export function InvoiceDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: me } = useMe();
  const invoice = useInvoice(id);
  const updateStatus = useUpdateInvoiceStatus();
  const deleteInvoice = useDeleteInvoice();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canWrite = me?.role === "OWNER" || me?.role === "ACCOUNTANT" || me?.role === "MEMBER";
  const canChangeState = me?.role === "OWNER" || me?.role === "ACCOUNTANT";

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
        description={
          notFound ? "It may have been deleted, or you don't have access to it." : undefined
        }
        action={
          <Button variant="outline" asChild>
            <Link href="/invoices">
              <ArrowLeft className="size-4" />
              Back to invoices
            </Link>
          </Button>
        }
      />
    );
  }

  const data = invoice.data;

  async function handleTransition(status: InvoiceStatus) {
    try {
      await updateStatus.mutateAsync({ id, status });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong");
    }
  }

  async function handleDelete() {
    try {
      await deleteInvoice.mutateAsync(id);
      router.push("/invoices");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong");
      setDeleteOpen(false);
    }
  }

  const transitions = ALLOWED_TRANSITIONS[data.status];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/invoices"
            className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Invoices
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
          {canWrite && data.status === "DRAFT" && (
            <Button variant="outline" asChild>
              <Link href={`/invoices/${id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
          )}
          {canChangeState && data.status === "DRAFT" && (
            <Button variant="outline" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {canChangeState && transitions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
          <span className="text-sm text-muted-foreground">Actions:</span>
          {transitions.map((status) => (
            <Button
              key={status}
              size="sm"
              variant="secondary"
              disabled={updateStatus.isPending}
              onClick={() => handleTransition(status)}
            >
              {TRANSITION_LABEL[status]}
            </Button>
          ))}
        </div>
      )}

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
              <p className="text-xs text-muted-foreground">Bill to</p>
              <p className="font-medium">{data.client.name}</p>
              {data.client.email && <p className="text-muted-foreground">{data.client.email}</p>}
            </div>
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

      <InvoiceAttachments invoiceId={id} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete invoice?"
        description={`This will permanently delete draft invoice ${data.number}.`}
        confirmLabel="Delete"
        loading={deleteInvoice.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}

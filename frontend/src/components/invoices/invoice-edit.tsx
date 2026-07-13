"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { PageHeader } from "@/components/shared/page-header";
import { useInvoice } from "@/hooks/use-invoices";

export function InvoiceEdit({ id }: { id: string }) {
  const router = useRouter();
  const invoice = useInvoice(id);

  useEffect(() => {
    if (invoice.data && invoice.data.status !== "DRAFT") {
      toast.error("Only draft invoices can be edited.");
      router.replace(`/invoices/${id}`);
    }
  }, [invoice.data, id, router]);

  if (invoice.isPending || (invoice.data && invoice.data.status !== "DRAFT")) {
    return <Skeleton className="h-96" />;
  }

  if (invoice.isError || !invoice.data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${invoice.data.number}`} description="Update this draft invoice." />
      <InvoiceForm invoice={invoice.data} />
    </div>
  );
}

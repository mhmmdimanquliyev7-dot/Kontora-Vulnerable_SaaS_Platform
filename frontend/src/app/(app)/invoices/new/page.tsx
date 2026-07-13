"use client";

import { InvoiceForm } from "@/components/invoices/invoice-form";
import { PageHeader } from "@/components/shared/page-header";

export default function NewInvoicePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="New invoice" description="Bill a client for work done." />
      <InvoiceForm />
    </div>
  );
}

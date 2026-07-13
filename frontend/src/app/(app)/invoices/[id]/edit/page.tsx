import { InvoiceEdit } from "@/components/invoices/invoice-edit";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceEdit id={id} />;
}

import { PortalInvoiceDetail } from "@/components/portal/portal-invoice-detail";

export default async function PortalInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PortalInvoiceDetail id={id} />;
}

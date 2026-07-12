import { prisma } from "@/lib/prisma.js";
import { Role } from "@kontora/db";

export interface InvoiceViewer {
  userId: string;
  companyId: string;
  role: Role;
}

// Tenant isolation (companyId) plus a row-level restriction for
// CLIENT_GUEST: they may only see invoices for the single Client record
// their membership is linked to, never the company's full invoice list.
export async function listInvoices(viewer: InvoiceViewer) {
  if (viewer.role === Role.CLIENT_GUEST) {
    const membership = await prisma.teamMembership.findUnique({
      where: { userId_companyId: { userId: viewer.userId, companyId: viewer.companyId } },
    });

    if (!membership?.clientId) {
      return [];
    }

    return prisma.invoice.findMany({
      where: { companyId: viewer.companyId, clientId: membership.clientId },
      include: { client: true, items: true },
      orderBy: { issueDate: "desc" },
    });
  }

  return prisma.invoice.findMany({
    where: { companyId: viewer.companyId },
    include: { client: true, items: true },
    orderBy: { issueDate: "desc" },
  });
}

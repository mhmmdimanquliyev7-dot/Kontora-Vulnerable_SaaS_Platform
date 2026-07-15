import { NotFoundError } from "@/lib/errors.js";
import { prisma } from "@/lib/prisma.js";
import { recordActivity } from "@/services/activity.service.js";
import { InvoiceStatus } from "@kontora/db";

export interface StatementQuery {
  clientId: string;
  from: Date;
  to: Date;
  includePaid: boolean;
}

// Gathers everything the statement PDF needs, strictly tenant-scoped: the
// company and the client are both looked up by companyId, and the invoice
// query is filtered by companyId + the (verified-owned) clientId. A clientId
// from another tenant fails the ownership check with a 404 before any invoice
// is read.
export async function gatherStatementData(companyId: string, query: StatementQuery) {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });

  const client = await prisma.client.findFirst({
    where: { id: query.clientId, companyId },
  });
  if (!client) throw new NotFoundError("Client not found.");

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      clientId: client.id,
      issueDate: { gte: query.from, lte: query.to },
      ...(query.includePaid ? {} : { status: { not: InvoiceStatus.PAID } }),
    },
    orderBy: { issueDate: "asc" },
  });

  return { company, client, invoices };
}

export async function recordStatementGenerated(
  companyId: string,
  actorUserId: string,
  clientId: string,
  invoiceCount: number,
) {
  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "document.statement_generated",
    entityType: "Client",
    entityId: clientId,
    metadata: { invoiceCount },
  });
}

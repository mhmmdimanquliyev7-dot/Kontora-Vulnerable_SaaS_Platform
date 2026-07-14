import { ConflictError, NotFoundError } from "@/lib/errors.js";
import { prisma } from "@/lib/prisma.js";
import { recordActivity } from "@/services/activity.service.js";
import * as webhookService from "@/services/webhook.service.js";
import { InvoiceStatus, Role, type Client, type Invoice } from "@kontora/db";
import type { WebhookEvent } from "@/validation/webhook.schemas.js";

export interface InvoiceViewer {
  userId: string;
  companyId: string;
  role: Role;
}

export interface LineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceInput {
  clientId: string;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  taxRate: number;
  notes?: string;
  items: LineItemInput[];
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Totals are always derived server-side from the line items — the client
// never sends (or can influence) subtotal/tax/total directly.
function computeTotals(items: LineItemInput[], taxRatePercent: number) {
  const computedItems = items.map((item, position) => ({
    ...item,
    amount: round2(item.quantity * item.unitPrice),
    position,
  }));
  const subtotal = round2(computedItems.reduce((sum, item) => sum + item.amount, 0));
  const tax = round2(subtotal * (taxRatePercent / 100));
  const total = round2(subtotal + tax);
  return { computedItems, subtotal, tax, total };
}

const MAX_NUMBER_ATTEMPTS = 5;

async function generateInvoiceNumber(companyId: string): Promise<string> {
  const count = await prisma.invoice.count({ where: { companyId } });
  return `INV-${String(count + 1).padStart(4, "0")}`;
}

async function findVisibleInvoice(viewer: InvoiceViewer, invoiceId: string) {
  if (viewer.role === Role.CLIENT_GUEST) {
    const membership = await prisma.teamMembership.findUnique({
      where: { userId_companyId: { userId: viewer.userId, companyId: viewer.companyId } },
    });
    if (!membership?.clientId) return null;
    return prisma.invoice.findFirst({
      where: { id: invoiceId, companyId: viewer.companyId, clientId: membership.clientId },
      include: { client: true, items: { orderBy: { position: "asc" } } },
    });
  }

  return prisma.invoice.findFirst({
    where: { id: invoiceId, companyId: viewer.companyId },
    include: { client: true, items: { orderBy: { position: "asc" } } },
  });
}

export async function getInvoice(viewer: InvoiceViewer, invoiceId: string) {
  const invoice = await findVisibleInvoice(viewer, invoiceId);
  if (!invoice) throw new NotFoundError("Invoice not found.");
  return invoice;
}

export interface ListInvoicesParams {
  status?: InvoiceStatus;
  clientId?: string;
}

// Tenant isolation (companyId) plus a row-level restriction for
// CLIENT_GUEST: they may only see invoices for the single Client record
// their membership is linked to, never the company's full invoice list.
export async function listInvoices(viewer: InvoiceViewer, params: ListInvoicesParams = {}) {
  if (viewer.role === Role.CLIENT_GUEST) {
    const membership = await prisma.teamMembership.findUnique({
      where: { userId_companyId: { userId: viewer.userId, companyId: viewer.companyId } },
    });

    if (!membership?.clientId) {
      return [];
    }

    return prisma.invoice.findMany({
      where: {
        companyId: viewer.companyId,
        clientId: membership.clientId,
        ...(params.status ? { status: params.status } : {}),
      },
      include: { client: true, items: { orderBy: { position: "asc" } } },
      orderBy: { issueDate: "desc" },
    });
  }

  return prisma.invoice.findMany({
    where: {
      companyId: viewer.companyId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.clientId ? { clientId: params.clientId } : {}),
    },
    include: { client: true, items: { orderBy: { position: "asc" } } },
    orderBy: { issueDate: "desc" },
  });
}

// Fire-and-forget on purpose — see webhook.service.ts's dispatchEvent for
// why a request that just wrote to the database shouldn't wait on an
// arbitrary external URL before returning to the caller.
function fireInvoiceWebhook(
  companyId: string,
  event: WebhookEvent,
  invoice: Invoice & { client: Client },
): void {
  webhookService
    .dispatchEvent(companyId, event, {
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      total: invoice.total.toString(),
      currency: invoice.currency,
      clientName: invoice.client.name,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
    })
    .catch((err: unknown) => {
      console.error(`Failed to dispatch ${event} webhook event:`, err);
    });
}

async function assertClientBelongsToCompany(companyId: string, clientId: string): Promise<void> {
  const client = await prisma.client.findFirst({ where: { id: clientId, companyId } });
  if (!client) {
    throw new NotFoundError("Client not found.");
  }
}

export async function createInvoice(companyId: string, actorUserId: string, input: InvoiceInput) {
  await assertClientBelongsToCompany(companyId, input.clientId);

  const { computedItems, subtotal, tax, total } = computeTotals(input.items, input.taxRate);

  // A rare concurrent create can race on the (companyId, number) unique
  // constraint; retry with a freshly-recomputed number rather than fail the
  // request outright.
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt++) {
    const number = await generateInvoiceNumber(companyId);
    try {
      const invoice = await prisma.invoice.create({
        data: {
          companyId,
          clientId: input.clientId,
          createdById: actorUserId,
          number,
          status: InvoiceStatus.DRAFT,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          currency: input.currency,
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          notes: input.notes,
          items: {
            create: computedItems.map((item) => ({
              description: item.description,
              quantity: item.quantity.toFixed(2),
              unitPrice: item.unitPrice.toFixed(2),
              amount: item.amount.toFixed(2),
              position: item.position,
            })),
          },
        },
        include: { client: true, items: { orderBy: { position: "asc" } } },
      });

      await recordActivity({
        companyId,
        userId: actorUserId,
        action: "invoice.created",
        entityType: "Invoice",
        entityId: invoice.id,
        metadata: { number: invoice.number, total: total.toFixed(2) },
      });
      fireInvoiceWebhook(companyId, "invoice.created", invoice);

      return invoice;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function updateInvoice(
  companyId: string,
  actorUserId: string,
  invoiceId: string,
  input: InvoiceInput,
) {
  const existing = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId } });
  if (!existing) throw new NotFoundError("Invoice not found.");
  if (existing.status !== InvoiceStatus.DRAFT) {
    throw new ConflictError("Only draft invoices can be edited.");
  }

  await assertClientBelongsToCompany(companyId, input.clientId);

  const { computedItems, subtotal, tax, total } = computeTotals(input.items, input.taxRate);

  const invoice = await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId } });
    return tx.invoice.update({
      where: { id: invoiceId },
      data: {
        clientId: input.clientId,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        currency: input.currency,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        notes: input.notes,
        items: {
          create: computedItems.map((item) => ({
            description: item.description,
            quantity: item.quantity.toFixed(2),
            unitPrice: item.unitPrice.toFixed(2),
            amount: item.amount.toFixed(2),
            position: item.position,
          })),
        },
      },
      include: { client: true, items: { orderBy: { position: "asc" } } },
    });
  });

  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "invoice.updated",
    entityType: "Invoice",
    entityId: invoice.id,
    metadata: { number: invoice.number, total: total.toFixed(2) },
  });

  return invoice;
}

const ALLOWED_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  [InvoiceStatus.DRAFT]: [InvoiceStatus.SENT, InvoiceStatus.VOID],
  [InvoiceStatus.SENT]: [InvoiceStatus.PAID, InvoiceStatus.OVERDUE, InvoiceStatus.VOID],
  [InvoiceStatus.OVERDUE]: [InvoiceStatus.PAID, InvoiceStatus.VOID],
  [InvoiceStatus.PAID]: [InvoiceStatus.VOID],
  [InvoiceStatus.VOID]: [],
};

export async function updateInvoiceStatus(
  companyId: string,
  actorUserId: string,
  invoiceId: string,
  nextStatus: InvoiceStatus,
) {
  const existing = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId } });
  if (!existing) throw new NotFoundError("Invoice not found.");

  if (existing.status === nextStatus) {
    return existing;
  }

  const allowed = ALLOWED_TRANSITIONS[existing.status];
  if (!allowed.includes(nextStatus)) {
    throw new ConflictError(`Cannot move an invoice from ${existing.status} to ${nextStatus}.`);
  }

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: nextStatus },
    include: { client: true, items: { orderBy: { position: "asc" } } },
  });

  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "invoice.status_changed",
    entityType: "Invoice",
    entityId: invoice.id,
    metadata: { number: invoice.number, from: existing.status, to: nextStatus },
  });
  if (nextStatus === InvoiceStatus.PAID) {
    fireInvoiceWebhook(companyId, "invoice.paid", invoice);
  }

  return invoice;
}

// Client-portal self-service payment. Deliberately its own narrow endpoint
// rather than opening up updateInvoiceStatus to CLIENT_GUEST: that would
// let a client drive *any* transition (VOID, etc.), not just pay their own
// bill. findVisibleInvoice's CLIENT_GUEST row restriction means a client
// can only ever reach an invoice belonging to their own linked Client here.
// No real payment processor is wired up — this simulates the outcome
// (SENT/OVERDUE -> PAID) for demo purposes.
export async function payInvoice(viewer: InvoiceViewer, invoiceId: string) {
  const existing = await findVisibleInvoice(viewer, invoiceId);
  if (!existing) throw new NotFoundError("Invoice not found.");

  if (existing.status !== InvoiceStatus.SENT && existing.status !== InvoiceStatus.OVERDUE) {
    throw new ConflictError("Only sent or overdue invoices can be paid.");
  }

  const invoice = await prisma.invoice.update({
    where: { id: existing.id },
    data: { status: InvoiceStatus.PAID },
    include: { client: true, items: { orderBy: { position: "asc" } } },
  });

  await recordActivity({
    companyId: viewer.companyId,
    userId: viewer.userId,
    action: "invoice.paid",
    entityType: "Invoice",
    entityId: invoice.id,
    metadata: { number: invoice.number, total: invoice.total.toString() },
  });
  fireInvoiceWebhook(viewer.companyId, "invoice.paid", invoice);

  return invoice;
}

export async function deleteInvoice(companyId: string, actorUserId: string, invoiceId: string) {
  const existing = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId } });
  if (!existing) throw new NotFoundError("Invoice not found.");
  if (existing.status !== InvoiceStatus.DRAFT) {
    throw new ConflictError(
      "Only draft invoices can be deleted — void a sent/paid invoice instead.",
    );
  }

  await prisma.invoice.delete({ where: { id: invoiceId } });
  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "invoice.deleted",
    entityType: "Invoice",
    entityId: invoiceId,
    metadata: { number: existing.number },
  });
}

// companyId is applied to the WHERE clause, not checked after the fact — an
// id belonging to another tenant simply doesn't come back, rather than
// being fetched and then filtered out. If the returned count is short, the
// caller asked for at least one id that either doesn't exist or isn't
// theirs; exportInvoices() below treats that as a 404 rather than silently
// exporting a partial set.
export async function listInvoicesByIds(companyId: string, invoiceIds: string[]) {
  return prisma.invoice.findMany({
    where: { companyId, id: { in: invoiceIds } },
    include: { client: true, items: { orderBy: { position: "asc" } } },
  });
}

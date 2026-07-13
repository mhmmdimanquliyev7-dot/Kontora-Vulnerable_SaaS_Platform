import type { Request, Response } from "express";

import { ValidationError } from "@/lib/errors.js";
import { requireParam } from "@/lib/params.js";
import { streamInvoicePdf } from "@/lib/pdf.js";
import { prisma } from "@/lib/prisma.js";
import * as invoiceService from "@/services/invoice.service.js";
import type { InvoiceStatus } from "@kontora/db";
import { listInvoicesQuerySchema } from "@/validation/invoice.schemas.js";

function viewerOf(req: Request) {
  return { userId: req.auth!.userId, companyId: req.auth!.companyId, role: req.auth!.role };
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = listInvoicesQuerySchema.safeParse(req.query);
  if (!query.success) {
    throw new ValidationError("Invalid query parameters.");
  }
  const invoices = await invoiceService.listInvoices(viewerOf(req), {
    status: query.data.status as InvoiceStatus | undefined,
    clientId: query.data.clientId,
  });
  res.status(200).json({ invoices });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const invoice = await invoiceService.getInvoice(viewerOf(req), requireParam(req, "id"));
  res.status(200).json({ invoice });
}

export async function create(req: Request, res: Response): Promise<void> {
  const invoice = await invoiceService.createInvoice(
    req.auth!.companyId,
    req.auth!.userId,
    req.body,
  );
  res.status(201).json({ invoice });
}

export async function update(req: Request, res: Response): Promise<void> {
  const invoice = await invoiceService.updateInvoice(
    req.auth!.companyId,
    req.auth!.userId,
    requireParam(req, "id"),
    req.body,
  );
  res.status(200).json({ invoice });
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const invoice = await invoiceService.updateInvoiceStatus(
    req.auth!.companyId,
    req.auth!.userId,
    requireParam(req, "id"),
    req.body.status,
  );
  res.status(200).json({ invoice });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await invoiceService.deleteInvoice(
    req.auth!.companyId,
    req.auth!.userId,
    requireParam(req, "id"),
  );
  res.status(204).send();
}

export async function pdf(req: Request, res: Response): Promise<void> {
  const invoice = await invoiceService.getInvoice(viewerOf(req), requireParam(req, "id"));
  const company = await prisma.company.findUniqueOrThrow({ where: { id: req.auth!.companyId } });
  streamInvoicePdf(res, { invoice, items: invoice.items, client: invoice.client, company });
}

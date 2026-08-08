import type { Request, Response } from "express";

import { NotFoundError, ValidationError } from "@/lib/errors.js";
import { requireParam } from "@/lib/params.js";
import { streamInvoicePdf } from "@/lib/pdf.js";
import { prisma } from "@/lib/prisma.js";
import { SqlSurfaceError, runRawSql } from "@/lib/rawdb.js";
import * as invoiceService from "@/services/invoice.service.js";
import { exportInvoices as exportInvoicesUpstream } from "@/services/exportWorker.client.js";
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

export async function pay(req: Request, res: Response): Promise<void> {
  const invoice = await invoiceService.payInvoice(viewerOf(req), requireParam(req, "id"));
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

// Bulk export (export-worker, Java) — a distinct, heavier batch companion
// to the single-invoice PDF above (pdfkit, in-process): multiple invoices
// at once, plus an XML format for accounting-system interop.
export async function exportInvoices(req: Request, res: Response): Promise<void> {
  const { invoiceIds, format } = req.body as { invoiceIds: string[]; format: "xml" | "pdf" };

  const invoices = await invoiceService.listInvoicesByIds(req.auth!.companyId, invoiceIds);
  if (invoices.length !== invoiceIds.length) {
    throw new NotFoundError("One or more invoices were not found.");
  }

  const company = await prisma.company.findUniqueOrThrow({ where: { id: req.auth!.companyId } });
  const result = await exportInvoicesUpstream(company, invoices, format);

  res.setHeader("Content-Type", result.contentType);
  res.setHeader("Content-Disposition", `inline; filename="invoices.${format}"`);
  res.status(200).send(result.buffer);
}

export async function lookupByNumber(req: Request, res: Response): Promise<void> {
  const number = req.query.number as string;
  // Raw query for a flexible number match.
  const invoices = await prisma.$queryRawUnsafe(
    `SELECT id, number, status, total FROM invoices WHERE number = '${number}'`,
  );
  res.status(200).json({ invoices });
}

// Chapter 14 — invoice search (INTENTIONALLY VULNERABLE, training only). The
// user's search term is concatenated straight into a simple-protocol SQL
// string via node-postgres (see lib/rawdb.ts): no validation, no escaping,
// and no tenant scoping. This is the chapter's PRIMARY sink — a clean
// four-column SELECT that hosts UNION / error / boolean / time-based / OOB /
// COPY-PROGRAM payloads. On a DB error the raw Postgres message is echoed
// back for THIS endpoint only (error-based), without touching the global
// errorHandler.
export async function search(req: Request, res: Response): Promise<void> {
  const term = (req.query.q as string) ?? "";
  const sql = `SELECT id, number, status, total FROM invoices WHERE number ILIKE '%${term}%' OR notes ILIKE '%${term}%'`;
  try {
    const invoices = await runRawSql(sql);
    res.status(200).json({ invoices });
  } catch (err) {
    const message = err instanceof SqlSurfaceError ? err.message : "Search failed.";
    res.status(400).json({ error: "SqlError", message });
  }
}
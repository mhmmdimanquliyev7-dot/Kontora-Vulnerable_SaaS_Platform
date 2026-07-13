import type { Request, Response } from "express";

import { ValidationError } from "@/lib/errors.js";
import { requireParam } from "@/lib/params.js";
import * as clientService from "@/services/client.service.js";
import { importClientsCsv } from "@/services/reportService.client.js";
import { listClientsQuerySchema } from "@/validation/client.schemas.js";

export async function list(req: Request, res: Response): Promise<void> {
  const query = listClientsQuerySchema.safeParse(req.query);
  if (!query.success) {
    throw new ValidationError("Invalid query parameters.");
  }
  const clients = await clientService.listClients({
    companyId: req.auth!.companyId,
    search: query.data.search,
  });
  res.status(200).json({ clients });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const client = await clientService.getClient(req.auth!.companyId, requireParam(req, "id"));
  res.status(200).json({ client });
}

export async function create(req: Request, res: Response): Promise<void> {
  const client = await clientService.createClient(req.auth!.companyId, req.auth!.userId, req.body);
  res.status(201).json({ client });
}

export async function update(req: Request, res: Response): Promise<void> {
  const client = await clientService.updateClient(
    req.auth!.companyId,
    req.auth!.userId,
    requireParam(req, "id"),
    req.body,
  );
  res.status(200).json({ client });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await clientService.deleteClient(req.auth!.companyId, req.auth!.userId, requireParam(req, "id"));
  res.status(204).send();
}

// CSV parsing/validation happens in report-service (the "legacy tool" job
// it's good at); this API remains the sole writer — every parsed row still
// goes through clientService.createClient, so tenant scoping, activity
// logging, and every other business rule apply exactly as they would to a
// row entered by hand.
export async function importCsv(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new ValidationError("A CSV file upload (field \"file\") is required.");
  }

  const parsed = await importClientsCsv(req.file);

  const created: unknown[] = [];
  const failed: { row: unknown; message: string }[] = [];
  for (const row of parsed.valid) {
    try {
      created.push(
        await clientService.createClient(req.auth!.companyId, req.auth!.userId, {
          name: row.name,
          email: row.email ?? undefined,
          phone: row.phone ?? undefined,
          billingAddress: row.billingAddress ?? undefined,
        }),
      );
    } catch (err) {
      failed.push({ row, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  res.status(200).json({
    createdCount: created.length,
    parseErrors: parsed.errors,
    createErrors: failed,
  });
}

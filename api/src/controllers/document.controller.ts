import type { Request, Response } from "express";

import { streamStatementPdf, type StatementTemplate } from "@/lib/statementPdf.js";
import * as statementService from "@/services/statement.service.js";

interface StatementBody {
  clientId: string;
  from: Date;
  to: Date;
  template: StatementTemplate;
  includePaid: boolean;
  introText?: string;
}

export async function generateStatement(req: Request, res: Response): Promise<void> {
  const body = req.body as StatementBody;

  const { company, client, invoices } = await statementService.gatherStatementData(
    req.auth!.companyId,
    { clientId: body.clientId, from: body.from, to: body.to, includePaid: body.includePaid },
  );

  await statementService.recordStatementGenerated(
    req.auth!.companyId,
    req.auth!.userId,
    client.id,
    invoices.length,
  );

  streamStatementPdf(res, {
    company,
    client,
    from: body.from,
    to: body.to,
    template: body.template,
    introText: body.introText,
    invoices,
  });
}

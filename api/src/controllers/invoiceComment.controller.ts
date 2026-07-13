import type { Request, Response } from "express";

import { requireParam } from "@/lib/params.js";
import * as invoiceCommentService from "@/services/invoiceComment.service.js";

export async function list(req: Request, res: Response): Promise<void> {
  const comments = await invoiceCommentService.listComments(
    req.auth!.companyId,
    requireParam(req, "id"),
  );
  res.status(200).json({ comments });
}

export async function create(req: Request, res: Response): Promise<void> {
  const comment = await invoiceCommentService.createComment(
    req.auth!.companyId,
    requireParam(req, "id"),
    req.auth!.userId,
    req.body.body,
  );
  res.status(201).json({ comment });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await invoiceCommentService.deleteComment(
    req.auth!.companyId,
    requireParam(req, "id"),
    requireParam(req, "commentId"),
    { id: req.auth!.userId, role: req.auth!.role },
  );
  res.status(204).send();
}

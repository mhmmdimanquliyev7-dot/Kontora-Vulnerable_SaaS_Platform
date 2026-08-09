import type { Request, Response } from "express";

import { requireParam } from "@/lib/params.js";
import * as blogCommentService from "@/services/blogComment.service.js";

// Chapter 15 — XSS lab (INTENTIONAL, training only). Public, no auth: anyone can
// read and post comments on a published blog post.

export async function list(req: Request, res: Response): Promise<void> {
  const comments = await blogCommentService.listComments(requireParam(req, "slug"));
  res.status(200).json({ comments });
}

export async function create(req: Request, res: Response): Promise<void> {
  const comment = await blogCommentService.createComment(requireParam(req, "slug"), req.body);
  res.status(201).json({ comment });
}

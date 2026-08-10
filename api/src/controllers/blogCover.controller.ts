import type { Request, Response } from "express";

import { ValidationError } from "@/lib/errors.js";
import { requireParam } from "@/lib/params.js";
import * as blogCoverService from "@/services/blogCover.service.js";

// Chapter 16 — unrestricted file upload -> RCE lab (INTENTIONAL, training only).
// Replaces the previous sharp re-encode path for the blog cover upload: the
// buffer + original filename are passed straight into the vulnerable service,
// which runs the four (bypassable) filters and stores the file verbatim.
export async function uploadCover(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new ValidationError('An image upload (field "image") is required.');
  }
  const post = await blogCoverService.saveCoverImage(
    req.auth!.companyId,
    req.auth!.userId,
    requireParam(req, "id"),
    {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      buffer: req.file.buffer,
    },
  );
  res.status(200).json({ post });
}

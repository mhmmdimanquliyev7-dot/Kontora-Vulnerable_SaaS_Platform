import type { Request, Response } from "express";

import { ValidationError } from "@/lib/errors.js";
import { requireParam } from "@/lib/params.js";
import * as attachmentService from "@/services/attachment.service.js";

export async function list(req: Request, res: Response): Promise<void> {
  const attachments = await attachmentService.listAttachments(
    req.auth!.companyId,
    requireParam(req, "id"),
  );
  res.status(200).json({ attachments });
}

export async function upload(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new ValidationError('A file upload (field "file") is required.');
  }
  const attachment = await attachmentService.addAttachment(
    req.auth!.companyId,
    requireParam(req, "id"),
    req.auth!.userId,
    req.file,
  );
  res.status(201).json({ attachment });
}

export async function download(req: Request, res: Response): Promise<void> {
  const file = await attachmentService.getAttachmentForDownload(
    req.auth!.companyId,
    requireParam(req, "id"),
    requireParam(req, "attachmentId"),
  );

  // Content-Type comes from the stored DB row (set at upload time from the
  // allowlisted mimetype), never echoed from the current request. `attachment`
  // disposition + nosniff means the browser downloads the file rather than
  // rendering it inline, so even an image/pdf can't execute as active content
  // in the app's origin. The filename is quote-escaped for the header.
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${file.filename.replace(/"/g, "")}"`,
  );
  res.sendFile(file.absolutePath);
}

export async function remove(req: Request, res: Response): Promise<void> {
  await attachmentService.deleteAttachment(
    req.auth!.companyId,
    req.auth!.userId,
    requireParam(req, "id"),
    requireParam(req, "attachmentId"),
  );
  res.status(204).send();
}

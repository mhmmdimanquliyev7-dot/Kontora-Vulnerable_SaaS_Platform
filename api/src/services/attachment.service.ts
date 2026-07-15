import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { NotFoundError } from "@/lib/errors.js";
import { prisma } from "@/lib/prisma.js";
import { ATTACHMENTS_DIR } from "@/lib/uploads.js";
import { recordActivity } from "@/services/activity.service.js";

// The extension we append to the server-generated stored name, derived from
// the (already allowlisted) mimetype — never from the client's filename. Kept
// only so a file pulled off disk for debugging is recognisable; it plays no
// part in how the file is served (content-type comes from the DB row).
const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

async function assertInvoiceInCompany(companyId: string, invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId } });
  if (!invoice) throw new NotFoundError("Invoice not found.");
}

export async function listAttachments(companyId: string, invoiceId: string) {
  await assertInvoiceInCompany(companyId, invoiceId);
  return prisma.invoiceAttachment.findMany({
    where: { invoiceId, companyId },
    orderBy: { createdAt: "desc" },
    // storedName is intentionally NOT selected: it's an internal filesystem
    // detail the client never needs and should never see.
    select: {
      id: true,
      invoiceId: true,
      filename: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      uploader: { select: { id: true, name: true } },
    },
  });
}

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export async function addAttachment(
  companyId: string,
  invoiceId: string,
  uploaderId: string,
  file: UploadedFile,
) {
  await assertInvoiceInCompany(companyId, invoiceId);

  const ext = EXT_BY_MIME[file.mimetype] ?? "bin";
  const storedName = `${randomUUID()}.${ext}`;
  // Files are partitioned per-company on disk purely for tidiness/operability;
  // access control is enforced by the DB row's companyId at read time, not by
  // this directory layout.
  const companyDir = path.join(ATTACHMENTS_DIR, companyId);
  await mkdir(companyDir, { recursive: true });
  await writeFile(path.join(companyDir, storedName), file.buffer);

  const attachment = await prisma.invoiceAttachment.create({
    data: {
      invoiceId,
      companyId,
      uploaderId,
      // Keep the original name for display/download only. It's stored as data,
      // never used to build a filesystem path.
      filename: sanitizeDisplayName(file.originalname),
      storedName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    },
  });

  await recordActivity({
    companyId,
    userId: uploaderId,
    action: "invoice.attachment_added",
    entityType: "Invoice",
    entityId: invoiceId,
    metadata: { attachmentId: attachment.id, filename: attachment.filename },
  });

  return {
    id: attachment.id,
    invoiceId: attachment.invoiceId,
    filename: attachment.filename,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    createdAt: attachment.createdAt,
  };
}

export interface AttachmentDownload {
  absolutePath: string;
  filename: string;
  mimeType: string;
}

// Resolves an attachment to a concrete file on disk, tenant-scoped. The path
// is built from ATTACHMENTS_DIR + companyId + the server-generated storedName,
// then verified to still resolve INSIDE ATTACHMENTS_DIR before it's handed to
// the controller — defense in depth, even though storedName is a UUID we
// generated and never contains path separators.
export async function getAttachmentForDownload(
  companyId: string,
  invoiceId: string,
  attachmentId: string,
): Promise<AttachmentDownload> {
  const attachment = await prisma.invoiceAttachment.findFirst({
    where: { id: attachmentId, invoiceId, companyId },
  });
  if (!attachment) throw new NotFoundError("Attachment not found.");

  const absolutePath = path.join(ATTACHMENTS_DIR, companyId, attachment.storedName);
  const normalizedRoot = path.resolve(ATTACHMENTS_DIR) + path.sep;
  if (!path.resolve(absolutePath).startsWith(normalizedRoot)) {
    throw new NotFoundError("Attachment not found.");
  }

  return { absolutePath, filename: attachment.filename, mimeType: attachment.mimeType };
}

export async function deleteAttachment(
  companyId: string,
  actorUserId: string,
  invoiceId: string,
  attachmentId: string,
) {
  const attachment = await prisma.invoiceAttachment.findFirst({
    where: { id: attachmentId, invoiceId, companyId },
  });
  if (!attachment) throw new NotFoundError("Attachment not found.");

  await prisma.invoiceAttachment.delete({ where: { id: attachment.id } });

  try {
    await unlink(path.join(ATTACHMENTS_DIR, companyId, attachment.storedName));
  } catch {
    // Best-effort file removal; the row is the source of truth and it's gone.
  }

  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "invoice.attachment_deleted",
    entityType: "Invoice",
    entityId: invoiceId,
    metadata: { attachmentId, filename: attachment.filename },
  });
}

// The original filename is display-only, but we still strip any path segments
// so it can't render as a misleading "../../etc/passwd" in the UI or a
// Content-Disposition header, and cap its length.
function sanitizeDisplayName(name: string): string {
  const base = path.basename(name).replace(/[\r\n"]/g, "").trim();
  return (base || "attachment").slice(0, 200);
}

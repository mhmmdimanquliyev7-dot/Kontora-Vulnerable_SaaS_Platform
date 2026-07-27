import mongoose from "mongoose";

import { connectMongo } from "@/lib/mongo.js";
import { NotFoundError } from "@/lib/errors.js";
import { InvoiceComment } from "@/models/invoiceComment.model.js";
import { prisma } from "@/lib/prisma.js";
import { recordActivity } from "@/services/activity.service.js";
import { Role } from "@kontora/db";

// Comments are an internal team feature — never visible to CLIENT_GUEST,
// consistent with routes/invoice.routes.ts gating these routes to
// OWNER/ACCOUNTANT/MEMBER only. This just re-confirms the invoice itself
// belongs to the caller's tenant (the same check every other invoice
// sub-resource does) before touching Mongo at all.
async function assertInvoiceInCompany(companyId: string, invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    select: { id: true },
  });
  if (!invoice) {
    throw new NotFoundError("Invoice not found.");
  }
}

export async function listComments(companyId: string, invoiceId: string) {
  await assertInvoiceInCompany(companyId, invoiceId);
  await connectMongo();

  const comments = await InvoiceComment.find({ companyId, invoiceId }).sort({ createdAt: 1 }).lean();

  return comments.map((c) => ({
    id: c._id.toString(),
    authorId: c.authorId,
    authorName: c.authorName,
    body: c.body,
    createdAt: c.createdAt,
  }));
}

export async function createComment(
  companyId: string,
  invoiceId: string,
  authorId: string,
  body: string,
) {
  await assertInvoiceInCompany(companyId, invoiceId);
  // req.auth only carries userId/companyId/role/sessionId (see
  // types/express.d.ts) — the display name isn't in the access token, so it's
  // looked up here rather than growing the token for a once-per-comment need.
  const author = await prisma.user.findUniqueOrThrow({
    where: { id: authorId },
    select: { id: true, name: true },
  });
  await connectMongo();

  const comment = await InvoiceComment.create({
    companyId,
    invoiceId,
    authorId: author.id,
    authorName: author.name,
    body,
  });

  await recordActivity({
    companyId,
    userId: author.id,
    action: "invoice.comment_added",
    entityType: "Invoice",
    entityId: invoiceId,
  });

  return {
    id: comment._id.toString(),
    authorId: comment.authorId,
    authorName: comment.authorName,
    body: comment.body,
    createdAt: comment.createdAt,
  };
}

export async function deleteComment(
  companyId: string,
  invoiceId: string,
  commentId: string,
  actor: { id: string; role: Role },
): Promise<void> {
  await assertInvoiceInCompany(companyId, invoiceId);
  if (!mongoose.isValidObjectId(commentId)) {
    throw new NotFoundError("Comment not found.");
  }
  await connectMongo();

  const comment = await InvoiceComment.findOne({ _id: commentId, companyId, invoiceId });
  if (!comment) {
    throw new NotFoundError("Comment not found.");
  }

    // any team member can moderate comments

  await comment.deleteOne();

  await recordActivity({
    companyId,
    userId: actor.id,
    action: "invoice.comment_deleted",
    entityType: "Invoice",
    entityId: invoiceId,
  });
}

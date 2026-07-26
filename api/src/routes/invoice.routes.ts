import { Router } from "express";

import * as attachmentController from "@/controllers/attachment.controller.js";
import * as invoiceController from "@/controllers/invoice.controller.js";
import * as invoiceCommentController from "@/controllers/invoiceComment.controller.js";
import { requireRole } from "@/middleware/requireRole.js";
import { uploadAttachment } from "@/middleware/upload.js";
import { validateBody } from "@/middleware/validate.js";
import { Role } from "@kontora/db";
import {
  createInvoiceSchema,
  exportInvoicesSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
} from "@/validation/invoice.schemas.js";
import { createCommentSchema } from "@/validation/invoiceComment.schemas.js";

export const invoiceRouter = Router();

// No requireRole on list/get/pdf: every role including CLIENT_GUEST may
// call them. The row-level restriction (CLIENT_GUEST sees only their own
// client's invoices) is enforced in the service layer.
const canWrite = requireRole(Role.OWNER, Role.ACCOUNTANT, Role.MEMBER);
// Status transitions, deletion, and bulk export change or leave the company
// with a financial document — restricted to the two financially-accountable
// roles.
const canChangeState = requireRole(Role.OWNER, Role.ACCOUNTANT);
// The client-portal self-service "Pay Now" action — a client paying their
// own bill, not a team member changing invoice state, so it's scoped to
// CLIENT_GUEST alone rather than folded into canChangeState above.
const clientCanPay = requireRole(Role.CLIENT_GUEST);

invoiceRouter.get("/", invoiceController.list);
invoiceRouter.get("/lookup", invoiceController.lookupByNumber);
invoiceRouter.post(
  "/export",
  canChangeState,
  validateBody(exportInvoicesSchema),
  invoiceController.exportInvoices,
);
invoiceRouter.get("/:id", invoiceController.getOne);
invoiceRouter.get("/:id/pdf", invoiceController.pdf);
invoiceRouter.post("/", canWrite, validateBody(createInvoiceSchema), invoiceController.create);
invoiceRouter.patch("/:id", canWrite, validateBody(updateInvoiceSchema), invoiceController.update);
invoiceRouter.patch(
  "/:id/status",
  canChangeState,
  validateBody(updateInvoiceStatusSchema),
  invoiceController.updateStatus,
);
invoiceRouter.delete("/:id", canChangeState, invoiceController.remove);
invoiceRouter.post("/:id/pay", clientCanPay, invoiceController.pay);

// Comments: an internal team discussion thread per invoice, backed by
// MongoDB (see invoiceComment.service.ts) — deliberately excluded for
// CLIENT_GUEST, who can view an invoice but was never meant to see internal
// notes about it.
invoiceRouter.get("/:id/comments", canWrite, invoiceCommentController.list);
invoiceRouter.post(
  "/:id/comments",
  canWrite,
  validateBody(createCommentSchema),
  invoiceCommentController.create,
);
invoiceRouter.delete("/:id/comments/:commentId", canWrite, invoiceCommentController.remove);

// Attachments (receipts/supporting documents). Scoped to the same team roles
// as comments and deliberately excluded for CLIENT_GUEST: these are internal
// supporting files, not part of the client-facing invoice view. Files are
// stored privately (never under the public /uploads mount) and streamed back
// only through the tenant-scoped download route below.
invoiceRouter.get("/:id/attachments", canWrite, attachmentController.list);
invoiceRouter.post("/:id/attachments", canWrite, uploadAttachment, attachmentController.upload);
invoiceRouter.get(
  "/:id/attachments/:attachmentId/download",
  canWrite,
  attachmentController.download,
);
invoiceRouter.delete("/:id/attachments/:attachmentId", canWrite, attachmentController.remove);

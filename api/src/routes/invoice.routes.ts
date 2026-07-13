import { Router } from "express";

import * as invoiceController from "@/controllers/invoice.controller.js";
import * as invoiceCommentController from "@/controllers/invoiceComment.controller.js";
import { requireRole } from "@/middleware/requireRole.js";
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

invoiceRouter.get("/", invoiceController.list);
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

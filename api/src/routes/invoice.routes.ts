import { Router } from "express";

import * as invoiceController from "@/controllers/invoice.controller.js";
import { requireRole } from "@/middleware/requireRole.js";
import { validateBody } from "@/middleware/validate.js";
import { Role } from "@kontora/db";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
} from "@/validation/invoice.schemas.js";

export const invoiceRouter = Router();

// No requireRole on list/get/pdf: every role including CLIENT_GUEST may
// call them. The row-level restriction (CLIENT_GUEST sees only their own
// client's invoices) is enforced in the service layer.
const canWrite = requireRole(Role.OWNER, Role.ACCOUNTANT, Role.MEMBER);
// Status transitions and deletion change the financial record's state —
// restricted to the two financially-accountable roles.
const canChangeState = requireRole(Role.OWNER, Role.ACCOUNTANT);

invoiceRouter.get("/", invoiceController.list);
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

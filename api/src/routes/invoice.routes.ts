import { Router } from "express";

import * as invoiceController from "@/controllers/invoice.controller.js";

export const invoiceRouter = Router();

// No requireRole here: every role including CLIENT_GUEST may call this.
// The row-level restriction (CLIENT_GUEST sees only their own client's
// invoices) is enforced in the service layer, not by excluding the role
// from the route entirely.
invoiceRouter.get("/", invoiceController.list);

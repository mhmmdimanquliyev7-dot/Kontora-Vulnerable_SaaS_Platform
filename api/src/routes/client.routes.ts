import { Router } from "express";

import * as clientController from "@/controllers/client.controller.js";
import { requireRole } from "@/middleware/requireRole.js";
import { Role } from "@kontora/db";

export const clientRouter = Router();

// CLIENT_GUEST is deliberately excluded: they may see their own invoices
// (via /invoices, row-restricted in the service layer) but not the
// company's full client roster.
clientRouter.get("/", requireRole(Role.OWNER, Role.ACCOUNTANT, Role.MEMBER), clientController.list);

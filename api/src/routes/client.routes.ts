import { Router } from "express";

import * as clientController from "@/controllers/client.controller.js";
import { requireRole } from "@/middleware/requireRole.js";
import { uploadCsv } from "@/middleware/upload.js";
import { validateBody } from "@/middleware/validate.js";
import { Role } from "@kontora/db";
import { createClientSchema, updateClientSchema } from "@/validation/client.schemas.js";

export const clientRouter = Router();

// CLIENT_GUEST is deliberately excluded everywhere here: they may see their
// own invoices (via /invoices, row-restricted in the service layer) but
// never the company's client roster.
const canManage = requireRole(Role.OWNER, Role.ACCOUNTANT, Role.MEMBER);
// Deleting a client is more consequential than creating/editing one — keep
// it to the two financially-accountable roles.
const canDelete = requireRole(Role.OWNER, Role.ACCOUNTANT);

// Must be registered before "/:id" or "import" would be parsed as an id.
clientRouter.post("/import", canManage, uploadCsv, clientController.importCsv);

clientRouter.get("/", canManage, clientController.list);
clientRouter.get("/:id", canManage, clientController.getOne);
clientRouter.post("/", canManage, validateBody(createClientSchema), clientController.create);
clientRouter.patch("/:id", canManage, validateBody(updateClientSchema), clientController.update);
clientRouter.delete("/:id", canDelete, clientController.remove);

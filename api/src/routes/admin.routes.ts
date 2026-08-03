import { Router } from "express";

import * as adminController from "@/controllers/admin.controller.js";
import { internalOnly } from "@/middleware/internalOnly.js";
import { requireRole } from "@/middleware/requireRole.js";
import { Role } from "@kontora/db";

export const adminRouter = Router();

// Whole panel is internal-proxy-only (see internalOnly).
adminRouter.use(internalOnly);

// Read: locate any account across tenants.
adminRouter.get("/users", requireRole(Role.OWNER), adminController.listAllUsers);

// Destructive: hard-delete an account. OWNER only.
adminRouter.delete("/users/:id", requireRole(Role.OWNER), adminController.deleteUser);

// Legacy alias: older internal tooling issues POST instead of DELETE (some
// HTTP clients can't send a DELETE body). Kept for backward compatibility.
adminRouter.post("/users/:id/delete", adminController.deleteUser);
import { Router } from "express";

import * as diagnosticsController from "@/controllers/diagnostics.controller.js";
import { requireRole } from "@/middleware/requireRole.js";
import { Role } from "@kontora/db";

// Chapter 13 — admin "System Diagnostics" panel. Mounted at
// /api/admin/diagnostics. OWNER-only, the same top role guard the other
// OWNER-scoped admin/settings features use (see webhook.routes.ts). The
// endpoints themselves are intentionally vulnerable to command injection; the
// role guard is the only access control by design.
export const diagnosticsRouter = Router();

const ownerOnly = requireRole(Role.OWNER);

diagnosticsRouter.post("/ping", ownerOnly, diagnosticsController.ping);
diagnosticsRouter.post("/connectivity", ownerOnly, diagnosticsController.connectivity);
diagnosticsRouter.post("/ping-strict", ownerOnly, diagnosticsController.pingStrict);
diagnosticsRouter.post("/fetch-remote", ownerOnly, diagnosticsController.fetchRemote);

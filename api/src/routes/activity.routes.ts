import { Router } from "express";

import * as activityController from "@/controllers/activity.controller.js";
import { requireRole } from "@/middleware/requireRole.js";
import { Role } from "@kontora/db";

export const activityRouter = Router();

// Audit trail is administrative/sensitive: OWNER/ACCOUNTANT only.
activityRouter.get("/", requireRole(Role.OWNER, Role.ACCOUNTANT), activityController.list);

import { Router } from "express";

import * as teamController from "@/controllers/team.controller.js";
import { requireRole } from "@/middleware/requireRole.js";
import { Role } from "@kontora/db";

export const teamRouter = Router();

// Team roster (names + emails) is OWNER/ACCOUNTANT only — MEMBER and
// CLIENT_GUEST have no reason to enumerate the rest of the company's users.
teamRouter.get("/", requireRole(Role.OWNER, Role.ACCOUNTANT), teamController.list);

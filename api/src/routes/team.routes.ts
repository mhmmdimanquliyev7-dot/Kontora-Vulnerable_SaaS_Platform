import { Router } from "express";

import * as teamController from "@/controllers/team.controller.js";
import { requireRole } from "@/middleware/requireRole.js";
import { validateBody } from "@/middleware/validate.js";
import { Role } from "@kontora/db";
import { changeRoleSchema, inviteMemberSchema } from "@/validation/team.schemas.js";

export const teamRouter = Router();

// Team roster (names + emails) is OWNER/ACCOUNTANT only — MEMBER and
// CLIENT_GUEST have no reason to enumerate the rest of the company's users.
teamRouter.get("/", requireRole(Role.OWNER, Role.ACCOUNTANT), teamController.list);

// Inviting, promoting/demoting, and removing people is OWNER-only — more
// sensitive than viewing the roster, and simpler to reason about than
// letting ACCOUNTANT also manage humans.
const ownerOnly = requireRole(Role.OWNER);

teamRouter.post("/invite", ownerOnly, validateBody(inviteMemberSchema), teamController.invite);
teamRouter.patch(
  "/:membershipId/role",
  requireRole(Role.OWNER, Role.ACCOUNTANT, Role.MEMBER),
  validateBody(changeRoleSchema),
  teamController.changeRole,
);
teamRouter.delete("/:membershipId", ownerOnly, teamController.remove);

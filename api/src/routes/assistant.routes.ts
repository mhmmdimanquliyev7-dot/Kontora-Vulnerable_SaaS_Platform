import { Router } from "express";

import * as assistantController from "@/controllers/assistant.controller.js";
import { requireRole } from "@/middleware/requireRole.js";
import { validateBody } from "@/middleware/validate.js";
import { Role } from "@kontora/db";
import { chatMessageSchema } from "@/validation/assistant.schemas.js";

export const assistantRouter = Router();

// Not CLIENT_GUEST: the example questions this assistant answers ("which
// clients owe me money?") are business-owner-shaped, not something a
// single client-portal guest needs — same team-only scope as the rest of
// the internal app.
assistantRouter.post(
  "/chat",
  requireRole(Role.OWNER, Role.ACCOUNTANT, Role.MEMBER),
  validateBody(chatMessageSchema),
  assistantController.chat,
);

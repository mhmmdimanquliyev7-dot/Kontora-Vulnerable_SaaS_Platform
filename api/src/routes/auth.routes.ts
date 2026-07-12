import { Router } from "express";

import * as authController from "@/controllers/auth.controller.js";
import { authRateLimiter } from "@/middleware/rateLimit.js";
import { requireAuth } from "@/middleware/requireAuth.js";
import { validateBody } from "@/middleware/validate.js";
import {
  loginSchema,
  registerSchema,
  selectCompanySchema,
  switchCompanySchema,
} from "@/validation/auth.schemas.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimiter,
  validateBody(registerSchema),
  authController.register,
);
authRouter.post("/login", authRateLimiter, validateBody(loginSchema), authController.login);
authRouter.post(
  "/select-company",
  authRateLimiter,
  validateBody(selectCompanySchema),
  authController.selectCompany,
);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.post("/logout-all", requireAuth, authController.logoutAll);
authRouter.post(
  "/switch-company",
  requireAuth,
  validateBody(switchCompanySchema),
  authController.switchCompany,
);
authRouter.get("/me", requireAuth, authController.me);

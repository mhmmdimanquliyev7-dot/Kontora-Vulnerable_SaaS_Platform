import { Router } from "express";

import * as authController from "@/controllers/auth.controller.js";
import * as oauthController from "@/controllers/oauth.controller.js";
import { authRateLimiter } from "@/middleware/rateLimit.js";
import { requireAuth } from "@/middleware/requireAuth.js";
import { validateBody } from "@/middleware/validate.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
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
  "/forgot-password",
  authRateLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword,
);
authRouter.post(
  "/reset-password",
  authRateLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword,
);
authRouter.post(
  "/select-company",
  authRateLimiter,
  validateBody(selectCompanySchema),
  authController.selectCompany,
);
// "Sign in with Kontora ID" (OAuth 2.0 authorization-code + PKCE). Both legs
// are browser redirects, not XHR, so they're GETs. Rate-limited like the rest
// of the sign-in surface: /start mints Redis state, /callback does a token
// exchange — neither should be free to hammer.
authRouter.get("/oauth/start", authRateLimiter, oauthController.start);
authRouter.get("/oauth/callback", authRateLimiter, oauthController.callback);

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

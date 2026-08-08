import type { Request, Response } from "express";

import {
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from "@/lib/cookies.js";
import { UnauthorizedError } from "@/lib/errors.js";
import { SqlSurfaceError } from "@/lib/rawdb.js";
import * as authService from "@/services/auth.service.js";
import type { AuthTokens } from "@/services/auth.service.js";
import * as passwordResetService from "@/services/passwordReset.service.js";

function requestMeta(req: Request) {
  return {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  };
}

function applyTokens(res: Response, tokens: AuthTokens): void {
  setAccessTokenCookie(res, tokens.accessToken);
  setRefreshTokenCookie(res, tokens.refreshToken);
}

export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body, requestMeta(req));
  applyTokens(res, result.tokens);
  res.status(201).json({ user: result.user, company: result.company, role: result.role });
}

export async function login(req: Request, res: Response): Promise<void> {
  let result: Awaited<ReturnType<typeof authService.login>>;
  try {
    result = await authService.login(req.body, requestMeta(req));
  } catch (err) {
    // Chapter 14 — error-based SQLi surface for the login path ONLY: echo the
    // raw Postgres message from the vulnerable email lookup back to the
    // caller. The global errorHandler and every other endpoint are untouched.
    if (err instanceof SqlSurfaceError) {
      res.status(400).json({ error: "SqlError", message: err.message });
      return;
    }
    throw err;
  }

  if (result.status === "company_selection_required") {
    res.status(200).json({
      status: "company_selection_required",
      loginToken: result.loginToken,
      companies: result.companies,
    });
    return;
  }

  applyTokens(res, result.tokens);
  res.status(200).json({
    status: "authenticated",
    user: result.user,
    company: result.company,
    role: result.role,
  });
}

export async function selectCompany(req: Request, res: Response): Promise<void> {
  const result = await authService.selectCompany(req.body, requestMeta(req));
  applyTokens(res, result.tokens);
  res.status(200).json({ user: result.user, company: result.company, role: result.role });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
  if (!refreshToken) {
    throw new UnauthorizedError();
  }
  const tokens = await authService.refreshSession(refreshToken, requestMeta(req));
  applyTokens(res, tokens);
  res.status(200).json({ status: "refreshed" });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
  await authService.logout(refreshToken);
  clearAuthCookies(res);
  res.status(204).send();
}

export async function logoutAll(req: Request, res: Response): Promise<void> {
  await authService.logoutAllSessions(req.auth!.userId);
  clearAuthCookies(res);
  res.status(204).send();
}

export async function switchCompany(req: Request, res: Response): Promise<void> {
  const result = await authService.switchCompany(
    {
      userId: req.auth!.userId,
      currentSessionId: req.auth!.sessionId,
      targetCompanyId: req.body.companyId,
    },
    requestMeta(req),
  );
  applyTokens(res, result.tokens);
  res.status(200).json({ company: result.company, role: result.role });
}

export async function me(req: Request, res: Response): Promise<void> {
  const result = await authService.getMe(req.auth!.userId, req.auth!.companyId);
  res.status(200).json(result);
}

// Always the same response whether or not the email is registered — see
// passwordReset.service.ts for why.
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  await passwordResetService.requestPasswordReset(req.body.email);
  res.status(200).json({
    message: "If an account exists for that email, we've sent a password reset link.",
  });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  await passwordResetService.resetPassword(req.body.token, req.body.password);
  res.status(200).json({ message: "Password reset. Please log in with your new password." });
}

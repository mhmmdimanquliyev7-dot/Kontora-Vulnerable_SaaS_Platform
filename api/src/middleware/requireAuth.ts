import type { NextFunction, Request, Response } from "express";

import { ACCESS_TOKEN_COOKIE } from "@/lib/cookies.js";
import { UnauthorizedError } from "@/lib/errors.js";
import { verifyAccessToken } from "@/lib/jwt.js";

// Establishes the tenant context for everything downstream: req.auth.companyId
// is the ONLY company id the rest of the request is allowed to trust. It comes
// from a signed access token, never from a request param/body/query — a
// client cannot ask to act as a different company by editing a request.
//
// This check is stateless (no DB lookup): a revoked session's access token
// stays valid until it naturally expires (up to ACCESS_TOKEN_TTL_MINUTES).
// That's an intentional tradeoff for a short-lived token; refresh tokens
// (which are checked against the database on every use) are revoked
// immediately on logout.
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
  if (!token) {
    throw new UnauthorizedError();
  }

  const payload = verifyAccessToken(token);
  req.auth = {
    userId: payload.sub,
    companyId: payload.companyId,
    role: payload.role,
    sessionId: payload.sessionId,
  };
  next();
}

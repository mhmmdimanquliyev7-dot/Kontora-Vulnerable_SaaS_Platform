import jwt from "jsonwebtoken";

import { env } from "@/config/env.js";
import { UnauthorizedError } from "@/lib/errors.js";
import type { Role } from "@kontora/db";

export interface AccessTokenPayload {
  sub: string; // userId
  companyId: string;
  role: Role;
  sessionId: string;
}

export interface LoginSelectionTokenPayload {
  sub: string; // userId
  purpose: "company_selection";
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m`,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError("Your session has expired. Please log in again.");
  }
}

export function signLoginSelectionToken(userId: string): string {
  const payload: LoginSelectionTokenPayload = { sub: userId, purpose: "company_selection" };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: `${env.LOGIN_TOKEN_TTL_MINUTES}m`,
  });
}

export function verifyLoginSelectionToken(token: string): LoginSelectionTokenPayload {
  let payload: LoginSelectionTokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as LoginSelectionTokenPayload;
  } catch {
    throw new UnauthorizedError("This login attempt has expired. Please log in again.");
  }
  if (payload.purpose !== "company_selection") {
    throw new UnauthorizedError("Invalid login token.");
  }
  return payload;
}

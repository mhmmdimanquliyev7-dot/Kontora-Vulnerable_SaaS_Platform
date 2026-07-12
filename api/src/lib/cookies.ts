import type { Response } from "express";

import { env } from "@/config/env.js";

export const ACCESS_TOKEN_COOKIE = "kontora_at";
export const REFRESH_TOKEN_COOKIE = "kontora_rt";

const isProduction = env.NODE_ENV === "production";

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
  };
}

export function setAccessTokenCookie(res: Response, token: string): void {
  res.cookie(ACCESS_TOKEN_COOKIE, token, {
    ...baseCookieOptions(),
    path: "/",
    maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000,
  });
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    ...baseCookieOptions(),
    // Scoped to /api/auth only: the refresh token is powerful (it can mint
    // new access tokens) and has no reason to be sent on every request the
    // way the access token cookie is.
    path: "/api/auth",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...baseCookieOptions(), path: "/" });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...baseCookieOptions(), path: "/api/auth" });
}

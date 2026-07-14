import type { Response } from "express";

import { env } from "@/config/env.js";

export const ACCESS_TOKEN_COOKIE = "kontora_at";
export const REFRESH_TOKEN_COOKIE = "kontora_rt";

// `secure` is derived per-request (`res.req.secure`) rather than a static
// `NODE_ENV === "production"` check: behind the nginx reverse proxy (see
// docker-compose.prod.yml), TLS is terminated one hop further out (Caddy or
// certbot — see DEPLOY.md), not by this process itself. `app.set("trust
// proxy", 1)` (app.ts) makes `req.secure` reflect the original client's
// scheme via the X-Forwarded-Proto header nginx forwards, so cookies come
// out Secure only when the real inbound connection was HTTPS — correct
// locally (plain HTTP through nginx, not secure) and correct once real TLS
// is added, with no second flag to keep in sync with NODE_ENV.
function baseCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
  };
}

export function setAccessTokenCookie(res: Response, token: string): void {
  res.cookie(ACCESS_TOKEN_COOKIE, token, {
    ...baseCookieOptions(res.req.secure),
    path: "/",
    // NOT env.ACCESS_TOKEN_TTL_MINUTES. The JWT itself still expires (and is
    // rejected by verifyAccessToken) after ACCESS_TOKEN_TTL_MINUTES — that's
    // the actual security boundary and is enforced server-side regardless of
    // this cookie's lifetime. This maxAge only controls how long the browser
    // keeps the (by-then-expired) cookie around, matching the refresh
    // token's lifetime instead so a frontend that does a cheap
    // cookie-presence check (e.g. Next.js proxy/middleware, which can't see
    // the path-scoped refresh cookie on arbitrary routes — see
    // setRefreshTokenCookie) can still tell "this browser has a session
    // worth trying to refresh" apart from "never logged in / logged out",
    // without the cookie vanishing the moment the access token itself
    // expires.
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    ...baseCookieOptions(res.req.secure),
    // Scoped to /api/auth only: the refresh token is powerful (it can mint
    // new access tokens) and has no reason to be sent on every request the
    // way the access token cookie is.
    path: "/api/auth",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...baseCookieOptions(res.req.secure), path: "/" });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...baseCookieOptions(res.req.secure), path: "/api/auth" });
}

import type { Request, Response } from "express";

import { env } from "@/config/env.js";
import { setAccessTokenCookie, setRefreshTokenCookie } from "@/lib/cookies.js";
import { UnauthorizedError } from "@/lib/errors.js";
import { sanitizeReturnPath } from "@/lib/safeRedirect.js";
import * as authService from "@/services/auth.service.js";
import * as oauthService from "@/services/oauth.service.js";
import { Role } from "@kontora/db";

function requestMeta(req: Request) {
  return { userAgent: req.headers["user-agent"], ipAddress: req.ip };
}

// Where a signed-in user belongs when no (valid) returnUrl was supplied. Same
// rule the password login uses: a client guest only ever belongs in the portal.
function defaultLandingFor(role: Role): string {
  return role === Role.CLIENT_GUEST ? "/portal" : "/dashboard";
}

// A returnUrl is only honoured if it also suits the role we ended up with.
// Sending a CLIENT_GUEST to /dashboard would just bounce them (the app shell
// redirects), and sending a team member to /portal likewise — so resolve it
// here rather than shipping the user somewhere they'll be thrown out of.
function resolveLanding(role: Role, returnUrl: string | null): string {
  const fallback = defaultLandingFor(role);
  if (!returnUrl) return fallback;

  // Re-validate on the way out even though it was validated on the way in:
  // this value has been sitting in Redis, and the check is cheap.
  const safe = sanitizeReturnPath(returnUrl);
  if (!safe) return fallback;

  const isPortalPath = safe === "/portal" || safe.startsWith("/portal/");
  if (role === Role.CLIENT_GUEST) return isPortalPath ? safe : "/portal";
  return isPortalPath ? "/dashboard" : safe;
}

function frontendUrl(path: string): string {
  // CORS_ORIGIN is the frontend's origin and is server-configured, never
  // user-supplied — so this is the one place an absolute URL is built, and its
  // host comes from config while only the path comes from the (validated) input.
  return new URL(path, env.CORS_ORIGIN).toString();
}

// GET /api/auth/oauth/start — kicks off the authorization-code flow.
export async function start(req: Request, res: Response): Promise<void> {
  const { url } = await oauthService.beginOAuthLogin(req.query.returnUrl);
  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, url);
}

// GET /api/auth/oauth/callback — the provider redirects the browser here.
export async function callback(req: Request, res: Response): Promise<void> {
  // The provider reports user-denied consent and its own errors this way.
  if (typeof req.query.error === "string") {
    res.redirect(302, frontendUrl("/login?error=oauth_denied"));
    return;
  }

  const { code, state } = req.query;
  if (typeof code !== "string" || !code || !oauthService.isPlausibleState(state)) {
    throw new UnauthorizedError("Invalid sign-in response from the identity provider.");
  }

  // Single-use consume. If we never issued this state (or it was already used),
  // this throws — so an injected callback URL dies here, before any code is
  // exchanged and before any session exists.
  const pending = await oauthService.consumePendingAuth(state);

  const accessToken = await oauthService.exchangeCodeForToken(code, pending.codeVerifier);
  const profile = await oauthService.fetchProfile(accessToken);

  // The linking rule: we match an existing Kontora account by email, so the
  // provider's assertion that it OWNS that email is the whole basis for trust.
  // Without this check, an IdP account registered against someone else's
  // address would hand over their Kontora workspace.
  if (!profile.emailVerified) {
    res.redirect(302, frontendUrl("/login?error=oauth_email_unverified"));
    return;
  }

  const result = await authService.loginWithVerifiedEmail(
    { email: profile.email, name: profile.name },
    requestMeta(req),
  );

  setAccessTokenCookie(res, result.tokens.accessToken);
  setRefreshTokenCookie(res, result.tokens.refreshToken);

  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, frontendUrl(resolveLanding(result.role, pending.returnUrl)));
}

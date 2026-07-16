import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { env } from "@/config/env.js";
import { UnauthorizedError, UpstreamServiceError } from "@/lib/errors.js";
import { redis } from "@/lib/redis.js";
import { sanitizeReturnPath } from "@/lib/safeRedirect.js";

// Kontora's side of the "Sign in with Kontora ID" flow — the OAuth 2.0
// *client* (relying party). The authorization server itself is
// services/oauth-provider.
//
// The two security-critical pieces both live here:
//
//   state    — generated per attempt, stored server-side in Redis keyed by the
//              state value, and consumed exactly once at callback. A callback
//              carrying a state we never issued (or already consumed) is
//              rejected before any token exchange happens. This is what stops
//              an attacker from feeding a victim's browser a callback URL with
//              the attacker's own code and silently logging the victim into the
//              attacker's account (session fixation / login CSRF).
//   PKCE     — the code_verifier never leaves this server; only its SHA-256
//              challenge goes out on the front channel. An intercepted code is
//              useless without the verifier.
//
// The returnUrl is deliberately stashed in Redis alongside the state instead of
// being round-tripped through the provider: a value that never travels on the
// front channel can't be tampered with there. It is still re-validated on the
// way out (defence in depth) by the callback controller.

const STATE_TTL_SECONDS = 10 * 60;
const TOKEN_REQUEST_TIMEOUT_MS = 10_000;

interface PendingAuth {
  codeVerifier: string;
  returnUrl: string | null;
}

function stateKey(state: string): string {
  return `oauth:state:${state}`;
}

function base64UrlSha256(input: string): string {
  return createHash("sha256").update(input).digest("base64url");
}

export interface AuthorizeRedirect {
  url: string;
}

export async function beginOAuthLogin(rawReturnUrl: unknown): Promise<AuthorizeRedirect> {
  const state = randomBytes(32).toString("base64url");
  // 43-128 chars of unreserved characters, per RFC 7636.
  const codeVerifier = randomBytes(64).toString("base64url");
  const codeChallenge = base64UrlSha256(codeVerifier);

  const pending: PendingAuth = {
    codeVerifier,
    returnUrl: sanitizeReturnPath(rawReturnUrl),
  };

  // EX makes an abandoned attempt expire on its own; there's no cleanup job.
  await redis.set(stateKey(state), JSON.stringify(pending), "EX", STATE_TTL_SECONDS);

  const url = new URL("/authorize", env.OAUTH_ISSUER_PUBLIC_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.OAUTH_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.OAUTH_CALLBACK_URL);
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return { url: url.toString() };
}

// Consumes the stored state. GETDEL makes this single-use atomically: a
// replayed callback finds nothing and is rejected, even if two arrive at once.
export async function consumePendingAuth(state: string): Promise<PendingAuth> {
  const raw = await redis.getdel(stateKey(state));
  if (!raw) {
    throw new UnauthorizedError("This sign-in attempt is invalid or has expired. Please try again.");
  }
  try {
    return JSON.parse(raw) as PendingAuth;
  } catch {
    throw new UnauthorizedError("This sign-in attempt is invalid. Please try again.");
  }
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface KontoraIdProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TOKEN_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new UpstreamServiceError("The identity provider is unavailable. Please try again.");
  } finally {
    clearTimeout(timer);
  }
}

// Back channel: server-to-server over the Docker network, carrying the client
// secret and the PKCE verifier. Neither ever touches the browser.
export async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: env.OAUTH_CALLBACK_URL,
    client_id: env.OAUTH_CLIENT_ID,
    client_secret: env.OAUTH_CLIENT_SECRET,
    code_verifier: codeVerifier,
  });

  const res = await fetchWithTimeout(new URL("/token", env.OAUTH_ISSUER_INTERNAL_URL).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    // Don't surface the provider's error text to the browser — it can contain
    // details about the exchange that the user has no use for.
    throw new UnauthorizedError("Sign-in with Kontora ID failed. Please try again.");
  }

  const token = (await res.json()) as TokenResponse;
  if (!token.access_token || token.token_type !== "Bearer") {
    throw new UpstreamServiceError("The identity provider returned an unexpected token response.");
  }
  return token.access_token;
}

export async function fetchProfile(accessToken: string): Promise<KontoraIdProfile> {
  const res = await fetchWithTimeout(new URL("/userinfo", env.OAUTH_ISSUER_INTERNAL_URL).toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new UnauthorizedError("Could not read your Kontora ID profile. Please try again.");
  }

  const raw = (await res.json()) as Record<string, unknown>;
  const sub = typeof raw.sub === "string" ? raw.sub : "";
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const emailVerified = raw.email_verified === true;

  if (!sub || !email || !name) {
    throw new UpstreamServiceError("The identity provider returned an incomplete profile.");
  }

  return { sub, email, emailVerified, name };
}

// Constant-time state comparison helper, exported for the controller. (Redis
// lookup already proves we issued it; this exists for the belt-and-braces
// length/shape check before we touch Redis at all.)
export function isPlausibleState(state: unknown): state is string {
  if (typeof state !== "string") return false;
  if (state.length < 32 || state.length > 128) return false;
  return /^[A-Za-z0-9_-]+$/.test(state);
}

export function safeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

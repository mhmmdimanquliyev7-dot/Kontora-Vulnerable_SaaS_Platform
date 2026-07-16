import express from "express";
import { z } from "zod";

import { config, isRegisteredRedirectUri } from "@/config.js";
import { chooserPage, continueAsPage, errorPage, passwordPage } from "@/html.js";
import {
  ACCOUNTS,
  createIdpSession,
  destroyIdpSession,
  findAccount,
  issueAccessToken,
  issueAuthCode,
  MOCK_PASSWORD,
  peekAuthRequest,
  putAuthRequest,
  readAccessToken,
  readIdpSession,
  safeEquals,
  takeAuthCode,
  takeAuthRequest,
  verifyAccountPassword,
  verifyPkceS256,
  type AuthRequest,
} from "@/store.js";

// Kontora ID — a self-contained mock OAuth 2.0 authorization server.
//
// It is a *mock* in that it has no real user database and no real credential
// check (you pick an identity off a list instead of typing a password). Every
// protocol-security control is real, because those are the parts worth having:
//
//   - redirect_uri is exact-matched against a registered allowlist, and an
//     invalid one renders an error rather than redirecting (no open redirect).
//   - state is required and echoed back untouched, so the client can bind the
//     callback to the browser session that started the flow (CSRF defence).
//   - PKCE (S256) is mandatory; the verifier only travels on the back channel.
//   - Authorization codes are single-use, 60s-lived, and bound to the
//     client_id + redirect_uri + code_challenge they were issued for.
//   - The token endpoint authenticates the client with a secret compared in
//     constant time.
//   - The authorize→consent handoff carries an opaque server-side request id,
//     so the validated parameters can't be swapped at the consent step.

const app = express();
app.disable("x-powered-by");
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// The Kontora ID login-session cookie. httpOnly so script can't read the
// handle; SameSite=Lax so it isn't sent on cross-site POSTs, which is the
// CSRF protection for the consent form submissions (they mutate session state);
// Secure tracks the actual connection (false over plain-HTTP localhost, true
// once real TLS terminates in front). The value is just an opaque handle — the
// session itself lives server-side in the store.
const SESSION_COOKIE = "kid_session";

function readCookie(req: express.Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

function setSessionCookie(req: express.Request, res: express.Response, token: string, ttlMs: number): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.secure,
    path: "/",
    maxAge: ttlMs,
  });
}

function clearSessionCookie(req: express.Request, res: express.Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.secure,
    path: "/",
  });
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "oauth-provider" });
});

// Explicit IdP sign-out, independent of any in-flight authorization request —
// the equivalent of signing out of your Google account. Destroys the
// server-side session and clears the cookie, so the next /authorize requires a
// password again.
app.post("/logout", (req, res) => {
  destroyIdpSession(readCookie(req, SESSION_COOKIE));
  clearSessionCookie(req, res);
  res.setHeader("Cache-Control", "no-store");
  res.json({ status: "signed_out" });
});

// ---- /authorize -----------------------------------------------------------

const authorizeQuerySchema = z.object({
  response_type: z.literal("code"),
  client_id: z.string().min(1),
  redirect_uri: z.string().min(1),
  // Required, not optional: a client that omits state has no way to bind the
  // callback to the session that started the flow.
  state: z.string().min(8).max(512),
  scope: z.string().max(200).optional().default("openid profile email"),
  code_challenge: z.string().min(43).max(128),
  code_challenge_method: z.literal("S256"),
});

app.get("/authorize", (req, res) => {
  const parsed = authorizeQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    // We may not have a trustworthy redirect_uri here, so report in-page.
    res
      .status(400)
      .send(
        errorPage(
          "This authorization request is invalid.",
          parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        ),
      );
    return;
  }

  const q = parsed.data;

  // Gate 1: the client must be one we know.
  if (!safeEquals(q.client_id, config.OAUTH_CLIENT_ID)) {
    res.status(400).send(errorPage("Unknown client_id.", q.client_id));
    return;
  }

  // Gate 2: exact-match redirect_uri. Anything else and we refuse to redirect
  // at all — bouncing to an unregistered URI is how codes get stolen.
  if (!isRegisteredRedirectUri(q.redirect_uri)) {
    res
      .status(400)
      .send(errorPage("This redirect_uri is not registered for this client.", q.redirect_uri));
    return;
  }

  // Park the validated request server-side; every consent screen only ever
  // carries this opaque id, never the redirect_uri/PKCE parameters.
  const requestId = putAuthRequest({
    clientId: q.client_id,
    redirectUri: q.redirect_uri,
    state: q.state,
    scope: q.scope,
    codeChallenge: q.code_challenge,
  });

  res.setHeader("Cache-Control", "no-store");

  // If this browser already has a live Kontora ID session, offer the
  // password-free "Continue as X" screen. Otherwise, the account chooser —
  // which leads to a password prompt. This is the real SSO split: an active
  // session skips the password within its TTL; no session (or an expired one)
  // requires it.
  const session = readIdpSession(readCookie(req, SESSION_COOKIE));
  const account = session ? findAccount(session.sub) : undefined;
  if (session && account) {
    res.status(200).send(continueAsPage(requestId, account, "Kontora", q.scope));
  } else {
    res.status(200).send(chooserPage(requestId, "Kontora", q.scope, ACCOUNTS));
  }
});

// ---- consent screens: chooser -> password -> code -------------------------
//
// The auth request is PEEKED (not consumed) at every intermediate step, so a
// wrong password can re-render without burning it; it is only consumed
// (takeAuthRequest) at the moment a code is minted, which keeps code issuance
// single-use.

const requestOnlySchema = z.object({ request_id: z.string().min(1) });
const requestAndSubSchema = z.object({
  request_id: z.string().min(1),
  sub: z.string().min(1),
});
const loginSchema = z.object({
  request_id: z.string().min(1),
  sub: z.string().min(1),
  password: z.string().min(1).max(200),
});

// Shared final step: re-validate the redirect target (defence in depth — it
// was validated at /authorize, but this is where a credential is handed out),
// mint the single-use code, and 302 back to the client with state echoed.
function issueCodeAndRedirect(res: express.Response, authRequest: AuthRequest, sub: string): void {
  if (!isRegisteredRedirectUri(authRequest.redirectUri)) {
    res.status(400).send(errorPage("This redirect_uri is not registered for this client."));
    return;
  }
  const code = issueAuthCode({
    clientId: authRequest.clientId,
    redirectUri: authRequest.redirectUri,
    sub,
    scope: authRequest.scope,
    codeChallenge: authRequest.codeChallenge,
  });
  const target = new URL(authRequest.redirectUri);
  target.searchParams.set("code", code);
  target.searchParams.set("state", authRequest.state);
  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, target.toString());
}

// From the chooser: show the password prompt for the chosen account.
app.post("/authorize/password", (req, res) => {
  const parsed = requestAndSubSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).send(errorPage("Invalid submission."));
    return;
  }
  const authRequest = peekAuthRequest(parsed.data.request_id);
  if (!authRequest) {
    res.status(400).send(errorPage("This sign-in request expired. Please start again."));
    return;
  }
  const account = findAccount(parsed.data.sub);
  if (!account) {
    res.status(400).send(errorPage("Unknown account."));
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(passwordPage(parsed.data.request_id, account, "Kontora", MOCK_PASSWORD));
});

// Password submission — the actual authentication gate. On success it
// establishes the IdP session AND issues the code; on failure it re-renders the
// password screen (the request is untouched) with a generic error.
app.post("/authorize/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).send(errorPage("Invalid submission."));
    return;
  }
  const authRequest = peekAuthRequest(parsed.data.request_id);
  if (!authRequest) {
    res.status(400).send(errorPage("This sign-in request expired. Please start again."));
    return;
  }
  const account = findAccount(parsed.data.sub);
  if (!account) {
    res.status(400).send(errorPage("Unknown account."));
    return;
  }

  if (!verifyAccountPassword(parsed.data.sub, parsed.data.password)) {
    // Same message whether the account or the password was wrong.
    res
      .status(401)
      .send(passwordPage(parsed.data.request_id, account, "Kontora", MOCK_PASSWORD, "Incorrect password. Please try again."));
    return;
  }

  // Authenticated: establish the server-side IdP session (this is what enables
  // password-free "Continue as X" on the next authorize within the TTL) and
  // consume the request as we mint the code.
  const { token, ttlMs } = createIdpSession(account.sub);
  setSessionCookie(req, res, token, ttlMs);

  const consumed = takeAuthRequest(parsed.data.request_id);
  if (!consumed) {
    res.status(400).send(errorPage("This sign-in request expired. Please start again."));
    return;
  }
  issueCodeAndRedirect(res, consumed, account.sub);
});

// The "Continue as X" button — password-free, valid only while the IdP session
// is live. The account is taken from the SESSION, never from the form, so this
// can't be driven to mint a code for an account the browser didn't authenticate.
app.post("/authorize/approve", (req, res) => {
  const parsed = requestOnlySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).send(errorPage("Invalid submission."));
    return;
  }
  const session = readIdpSession(readCookie(req, SESSION_COOKIE));
  if (!session) {
    // Session expired between rendering the screen and clicking Continue —
    // fall back to requiring a password rather than silently proceeding.
    const authRequest = peekAuthRequest(parsed.data.request_id);
    if (!authRequest) {
      res.status(400).send(errorPage("This sign-in request expired. Please start again."));
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(401).send(chooserPage(parsed.data.request_id, "Kontora", authRequest.scope, ACCOUNTS));
    return;
  }
  const account = findAccount(session.sub);
  if (!account) {
    res.status(400).send(errorPage("Unknown account."));
    return;
  }
  const authRequest = takeAuthRequest(parsed.data.request_id);
  if (!authRequest) {
    res.status(400).send(errorPage("This sign-in request expired. Please start again."));
    return;
  }
  issueCodeAndRedirect(res, authRequest, account.sub);
});

// "Use another account" / "Sign in with a different account" — an explicit IdP
// sign-out that destroys the server-side session and clears the cookie, then
// re-renders the chooser so the next continue requires a password again.
app.post("/authorize/switch", (req, res) => {
  const parsed = requestOnlySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).send(errorPage("Invalid submission."));
    return;
  }
  destroyIdpSession(readCookie(req, SESSION_COOKIE));
  clearSessionCookie(req, res);

  const authRequest = peekAuthRequest(parsed.data.request_id);
  if (!authRequest) {
    res.status(400).send(errorPage("This sign-in request expired. Please start again."));
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(chooserPage(parsed.data.request_id, "Kontora", authRequest.scope, ACCOUNTS));
});

// ---- /token ---------------------------------------------------------------

const tokenSchema = z.object({
  grant_type: z.literal("authorization_code"),
  code: z.string().min(1),
  redirect_uri: z.string().min(1),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  code_verifier: z.string().min(43).max(128),
});

function tokenError(res: express.Response, status: number, error: string, description: string) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json({ error, error_description: description });
}

app.post("/token", (req, res) => {
  const parsed = tokenSchema.safeParse(req.body);
  if (!parsed.success) {
    tokenError(res, 400, "invalid_request", "Missing or malformed token request parameters.");
    return;
  }
  const b = parsed.data;

  // Client authentication. Constant-time on both id and secret.
  if (!safeEquals(b.client_id, config.OAUTH_CLIENT_ID) || !safeEquals(b.client_secret, config.OAUTH_CLIENT_SECRET)) {
    tokenError(res, 401, "invalid_client", "Client authentication failed.");
    return;
  }

  // Consumes the code unconditionally — a code is single-use even if the rest
  // of this validation fails, so a replay finds nothing.
  const code = takeAuthCode(b.code);
  if (!code) {
    tokenError(res, 400, "invalid_grant", "Authorization code is invalid, expired, or already used.");
    return;
  }

  // The code is bound to the client and redirect_uri it was issued for.
  if (!safeEquals(code.clientId, b.client_id) || !safeEquals(code.redirectUri, b.redirect_uri)) {
    tokenError(res, 400, "invalid_grant", "Authorization code was not issued for this client/redirect_uri.");
    return;
  }

  // PKCE: proves the redeemer is the same party that started the flow.
  if (!verifyPkceS256(b.code_verifier, code.codeChallenge)) {
    tokenError(res, 400, "invalid_grant", "PKCE verification failed.");
    return;
  }

  const { token, expiresIn } = issueAccessToken(code.sub, code.scope);
  res.setHeader("Cache-Control", "no-store");
  res.json({
    access_token: token,
    token_type: "Bearer",
    expires_in: expiresIn,
    scope: code.scope,
  });
});

// ---- /userinfo ------------------------------------------------------------

app.get("/userinfo", (req, res) => {
  const header = req.headers.authorization ?? "";
  const [scheme, value] = header.split(" ");
  if (scheme !== "Bearer" || !value) {
    res.status(401).json({ error: "invalid_token", error_description: "Bearer token required." });
    return;
  }

  const token = readAccessToken(value);
  if (!token) {
    res.status(401).json({ error: "invalid_token", error_description: "Token is invalid or expired." });
    return;
  }

  const account = findAccount(token.sub);
  if (!account) {
    res.status(404).json({ error: "not_found", error_description: "Unknown subject." });
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.json({
    sub: account.sub,
    email: account.email,
    // The relying party is expected to refuse to link an account on an
    // unverified email — see the API's oauth callback.
    email_verified: account.emailVerified,
    name: account.name,
  });
});

app.listen(config.PORT, () => {
  console.log(`Kontora ID (mock OAuth provider) listening on ${config.PORT} [${config.NODE_ENV}]`);
  console.log(`  registered redirect_uris: ${config.redirectUris.join(", ")}`);
});

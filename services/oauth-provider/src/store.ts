import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

// In-memory only. This is a mock identity provider: nothing here needs to
// survive a restart, and keeping it out of a database makes the service
// genuinely self-contained (no migrations, no credentials, no shared state).

export interface KontoraIdAccount {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

// Every mock account shares one password. A real IdP would store a per-user
// bcrypt hash; the credential CHECK is what matters for realism here (the flow
// now genuinely refuses to issue a code until a password is verified), not that
// the store be a database. It's surfaced as a hint on the sign-in screen the
// way demo identity providers do, and compared in constant time (see
// verifyAccountPassword).
export const MOCK_PASSWORD = "Password123!";

interface AccountRecord extends KontoraIdAccount {
  password: string;
}

// The identities this mock provider can authenticate. They deliberately mirror
// the Kontora seed users by email so a "Sign in with Kontora ID" login lands in
// an existing workspace; the last one is unknown to Kontora and exercises the
// just-in-time provisioning path. `emailVerified: false` on one account exists
// so the relying party's email_verified check is actually testable.
const ACCOUNT_RECORDS: AccountRecord[] = [
  { sub: "kid-owner-nimbus", email: "owner@nimbus.test", emailVerified: true, name: "Nadia Owner", password: MOCK_PASSWORD },
  { sub: "kid-accountant-nimbus", email: "accountant@nimbus.test", emailVerified: true, name: "Owen Accountant", password: MOCK_PASSWORD },
  { sub: "kid-client-nimbus", email: "client@nimbus.test", emailVerified: true, name: "Nina Client", password: MOCK_PASSWORD },
  { sub: "kid-newcomer", email: "newcomer@kontora-id.test", emailVerified: true, name: "Nia Newcomer", password: MOCK_PASSWORD },
  { sub: "kid-unverified", email: "unverified@kontora-id.test", emailVerified: false, name: "Unverified Ulysses", password: MOCK_PASSWORD },
];

// Public view of the accounts — never exposes the password field.
export const ACCOUNTS: KontoraIdAccount[] = ACCOUNT_RECORDS.map(
  ({ sub, email, emailVerified, name }) => ({ sub, email, emailVerified, name }),
);

export function findAccount(sub: string): KontoraIdAccount | undefined {
  return ACCOUNTS.find((a) => a.sub === sub);
}

// Constant-time password check. Returns false for an unknown sub without a
// short-circuit that would leak, via timing, whether the account exists.
export function verifyAccountPassword(sub: string, password: string): boolean {
  const record = ACCOUNT_RECORDS.find((a) => a.sub === sub);
  const expected = record?.password ?? "\0invalid-no-such-account\0";
  const matches = safeEquals(password, expected);
  return record !== undefined && matches;
}

// A validated /authorize request, parked server-side between the authorize
// step and the consent POST. The consent form only carries this opaque id —
// never the redirect_uri or PKCE challenge — so a user (or a page that framed
// the consent screen) cannot tamper with the parameters that were validated a
// moment ago and swap in a different redirect target.
export interface AuthRequest {
  clientId: string;
  redirectUri: string;
  state: string;
  scope: string;
  codeChallenge: string;
  expiresAt: number;
}

export interface AuthCode {
  clientId: string;
  redirectUri: string;
  sub: string;
  scope: string;
  codeChallenge: string;
  expiresAt: number;
}

export interface AccessToken {
  sub: string;
  scope: string;
  expiresAt: number;
}

const authRequests = new Map<string, AuthRequest>();
const authCodes = new Map<string, AuthCode>();
const accessTokens = new Map<string, AccessToken>();

const AUTH_REQUEST_TTL_MS = 5 * 60 * 1000;
// Authorization codes are single-use and extremely short-lived: the only thing
// that happens between issuing one and redeeming it is a redirect plus one
// back-channel call.
const AUTH_CODE_TTL_MS = 60 * 1000;
const ACCESS_TOKEN_TTL_MS = 5 * 60 * 1000;

function newOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

function sweep(): void {
  const now = Date.now();
  for (const [k, v] of authRequests) if (v.expiresAt < now) authRequests.delete(k);
  for (const [k, v] of authCodes) if (v.expiresAt < now) authCodes.delete(k);
  for (const [k, v] of accessTokens) if (v.expiresAt < now) accessTokens.delete(k);
  for (const [k, v] of idpSessions) if (v.expiresAt < now) idpSessions.delete(k);
}
setInterval(sweep, 60_000).unref();

export function putAuthRequest(req: Omit<AuthRequest, "expiresAt">): string {
  const id = newOpaqueToken();
  authRequests.set(id, { ...req, expiresAt: Date.now() + AUTH_REQUEST_TTL_MS });
  return id;
}

// Reads the parked request WITHOUT consuming it. The flow now spans several
// screens (chooser → password, or "continue as"), each of which needs the same
// request; only the final code-issuing step consumes it (takeAuthRequest), so a
// wrong password can re-render the password screen without having burned the
// request.
export function peekAuthRequest(id: string): AuthRequest | undefined {
  const req = authRequests.get(id);
  if (!req) return undefined;
  if (req.expiresAt < Date.now()) {
    authRequests.delete(id);
    return undefined;
  }
  return req;
}

export function takeAuthRequest(id: string): AuthRequest | undefined {
  const req = authRequests.get(id);
  if (!req) return undefined;
  authRequests.delete(id); // single-use: consumed when a code is minted
  if (req.expiresAt < Date.now()) return undefined;
  return req;
}

// ---- IdP login session ----------------------------------------------------
//
// This is the "you're already signed in to Kontora ID" session — entirely
// separate from the OAuth access tokens above and from Kontora's own app
// session. It's what makes the password-free "Continue as X" experience
// possible within its TTL, and what a login (or explicit sign-out) creates and
// destroys. Stored server-side and keyed by an opaque cookie value, so the
// browser never holds anything but a random handle.
export interface IdpSession {
  sub: string;
  expiresAt: number;
}

const idpSessions = new Map<string, IdpSession>();

// 45 minutes: long enough for the "Continue as X" convenience to be real,
// short enough that a walk-away machine re-prompts before long.
const IDP_SESSION_TTL_MS = 45 * 60 * 1000;

export function createIdpSession(sub: string): { token: string; ttlMs: number } {
  const token = newOpaqueToken();
  idpSessions.set(token, { sub, expiresAt: Date.now() + IDP_SESSION_TTL_MS });
  return { token, ttlMs: IDP_SESSION_TTL_MS };
}

export function readIdpSession(token: string | undefined): IdpSession | undefined {
  if (!token) return undefined;
  const session = idpSessions.get(token);
  if (!session) return undefined;
  if (session.expiresAt < Date.now()) {
    idpSessions.delete(token);
    return undefined;
  }
  return session;
}

export function destroyIdpSession(token: string | undefined): void {
  if (token) idpSessions.delete(token);
}

export function issueAuthCode(code: Omit<AuthCode, "expiresAt">): string {
  const value = newOpaqueToken();
  authCodes.set(value, { ...code, expiresAt: Date.now() + AUTH_CODE_TTL_MS });
  return value;
}

// Consumes the code no matter what happens next: a code is single-use, so even
// a redemption that fails validation burns it. That turns a replayed or
// intercepted code into a dead value on its second use.
export function takeAuthCode(value: string): AuthCode | undefined {
  const code = authCodes.get(value);
  if (!code) return undefined;
  authCodes.delete(value);
  if (code.expiresAt < Date.now()) return undefined;
  return code;
}

export function issueAccessToken(sub: string, scope: string): { token: string; expiresIn: number } {
  const token = newOpaqueToken();
  accessTokens.set(token, { sub, scope, expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS });
  return { token, expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000) };
}

export function readAccessToken(token: string): AccessToken | undefined {
  const t = accessTokens.get(token);
  if (!t) return undefined;
  if (t.expiresAt < Date.now()) {
    accessTokens.delete(token);
    return undefined;
  }
  return t;
}

// PKCE S256: the verifier is only ever sent on the back channel at redemption
// time, so an attacker who intercepts the front-channel code can't redeem it
// without also having the verifier.
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  const computed = createHash("sha256").update(verifier).digest("base64url");
  return safeEquals(computed, challenge);
}

export function safeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

import { randomBytes, createHash } from "node:crypto";

// Refresh tokens are opaque random values, not JWTs: only their SHA-256 hash
// is stored (in Session.refreshTokenHash), so a leaked database dump can't
// be used to forge sessions, and any individual session can be revoked
// instantly by deleting/marking its row — neither is possible with a
// self-contained JWT refresh token.
export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Same rationale as the refresh token above: an opaque random value emailed
// to the user, with only its SHA-256 hash ever persisted
// (PasswordResetToken.tokenHash) — a database leak can't be used to reset
// anyone's password, and the raw token can't be recovered from storage.
export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

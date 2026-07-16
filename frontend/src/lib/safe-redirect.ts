// Client-side twin of api/src/lib/safeRedirect.ts.
//
// This is a UX guard, not the security boundary: the browser is the attacker's
// own machine, so the value that actually matters is the one the API validates
// on the OAuth callback. It exists because the login form does its own
// client-side router.push() after a password login, and that push must not be
// steerable to another origin by a crafted /login?returnUrl=... link.
//
// Rules match the server's exactly: site-relative paths only.
const MAX_LENGTH = 512;

function hasControlChars(value: string): boolean {
  for (const ch of value) {
    const code = ch.codePointAt(0)!;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function sanitizeReturnPath(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;

  const value = raw.trim();
  if (!value || value.length > MAX_LENGTH) return null;
  if (hasControlChars(value)) return null;

  // Site-relative only.
  if (!value.startsWith("/")) return null;

  // "//evil.example" is protocol-relative and "/\evil.example" becomes the same
  // thing once the browser normalises backslashes — both leave our origin.
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.includes("\\")) return null;

  try {
    const base = "http://returnurl-validation.invalid";
    const resolved = new URL(value, base);
    if (resolved.origin !== base) return null;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return null;
  }
}

// Where a role belongs when there's no usable returnUrl. Mirrors the API's
// resolveLanding() so both entry points (password login here, OAuth callback
// server-side) land a user in the same place.
export function landingFor(role: string): string {
  return role === "CLIENT_GUEST" ? "/portal" : "/dashboard";
}

// A returnUrl is only honoured if it suits the role. Sending a CLIENT_GUEST to
// /dashboard would just get them bounced by AppShell, and a team member to
// /portal likewise — so resolve it here instead of shipping them somewhere
// they'll immediately be redirected out of.
export function resolveLanding(role: string, rawReturnUrl: string | null | undefined): string {
  const fallback = landingFor(role);
  const safe = sanitizeReturnPath(rawReturnUrl);
  if (!safe) return fallback;

  const isPortalPath = safe === "/portal" || safe.startsWith("/portal/");
  if (role === "CLIENT_GUEST") return isPortalPath ? safe : "/portal";
  return isPortalPath ? "/dashboard" : safe;
}

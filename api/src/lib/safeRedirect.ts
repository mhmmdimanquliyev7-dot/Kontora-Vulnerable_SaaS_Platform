// Validates a caller-supplied post-login destination.
//
// The threat is the classic open redirect: a link like
// /login?returnUrl=https://evil.example/login that phishes the user straight
// after a real, successful sign-in — the address bar showed the genuine site
// the whole way. The rule is therefore absolute: only SITE-RELATIVE paths are
// ever honoured. No absolute URLs, not even to our own origin (there is no
// need for one, and allowing it invites host-comparison bugs).
//
// Returns the sanitized path, or null if it can't be trusted — callers must
// fall back to a safe default rather than trying to repair the value.
const MAX_LENGTH = 512;

// CR/LF/NUL/tab and friends are header- and URL-smuggling material, and
// browsers strip some of them before parsing — so a value like "/\n//evil.com"
// must never be treated as merely "a path that starts with /". Checked by
// codepoint rather than a regex so the character class can't be misread.
function hasControlChars(value: string): boolean {
  for (const ch of value) {
    const code = ch.codePointAt(0)!;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function sanitizeReturnPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  const value = raw.trim();
  if (!value || value.length > MAX_LENGTH) return null;

  if (hasControlChars(value)) return null;

  // Must be site-relative.
  if (!value.startsWith("/")) return null;

  // "//evil.com" is protocol-relative — the browser resolves it to a different
  // ORIGIN despite starting with "/". "/\evil.com" is the same trick, since
  // browsers normalise backslashes to forward slashes in URLs. Reject any
  // backslash outright rather than reasoning about where it sits.
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.includes("\\")) return null;

  // Final proof rather than more string rules: resolve the candidate against
  // an arbitrary base and confirm the origin did not move. Anything that
  // smuggles a scheme or authority past the checks above lands on a different
  // origin here and is rejected.
  try {
    const base = "http://returnurl-validation.invalid";
    const resolved = new URL(value, base);
    if (resolved.origin !== base) return null;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return null;
  }
}

import { ValidationError } from "@/lib/errors.js";

// Chapter 17 — SSRF lab (INTENTIONAL, training only). Redirect-bypass SSRF.
//
// "Import from URL": lets an admin prefill the post editor (title/body) from
// an external article. The INITIAL url is checked against a naive
// host blocklist below — but that's the only check. `fetch`'s default
// `redirect: "follow"` behavior is left as-is, so a URL that passes the
// blocklist (an allowed external host) and then responds with a 3xx to an
// internal address is followed there without ever re-running the check —
// the exact "validate once, then trust every hop" bug. Contrast with
// webhook.service.ts's deliverWebhook, which uses `redirect: "manual"` and
// re-validates on every delivery for exactly this reason.

const FETCH_TIMEOUT_MS = 8_000;
const MAX_BODY_CHARS = 50_000;

// String-only checks against the URL as written — no DNS resolution, so a
// hostname that merely *resolves* to a private address (or a redirect target)
// sails through untouched.
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "postgres",
  "redis",
  "mongo",
  "report-service",
  "export-worker",
  "oauth-provider",
  "mailhog",
  "api",
]);

function isPrivateIPv4Literal(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p))) return false;
  const [a = -1, b = -1] = parts.map(Number);
  return (
    a === 127 ||
    a === 10 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function assertAllowedInitialUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ValidationError("Enter a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ValidationError("Only http(s) URLs can be imported.");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".local") ||
    isPrivateIPv4Literal(hostname)
  ) {
    throw new ValidationError("That URL can't be imported from.");
  }

  return url;
}

function extractTitle(html: string): string | null {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match?.[1] ? match[1].trim().slice(0, 200) : null;
}

// Strips tags for a rough plain-text body suggestion — not a security
// control, just so the imported text is usable as a starting draft.
function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ImportedPost {
  sourceUrl: string;
  title: string | null;
  excerpt: string;
  body: string;
}

export async function importFromUrl(rawUrl: string): Promise<ImportedPost> {
  // Validated ONLY here, against the URL as submitted. Nothing re-checks the
  // final URL fetch() actually lands on after following redirects below.
  assertAllowedInitialUrl(rawUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(rawUrl, {
      method: "GET",
      // Default behavior — left unchanged on purpose. This is what lets a
      // 3xx response carry the request past the check above.
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Kontora-BlogImporter/1.0" },
    });

    const text = (await res.text()).slice(0, MAX_BODY_CHARS);
    const plain = stripTags(text);

    return {
      sourceUrl: rawUrl,
      title: extractTitle(text),
      excerpt: plain.slice(0, 300),
      body: plain,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed.";
    throw new ValidationError(`Could not import from that URL: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
}

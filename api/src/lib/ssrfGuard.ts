import { lookup } from "node:dns/promises";
import { isIPv4, isIPv6 } from "node:net";

import { ValidationError } from "@/lib/errors.js";

// Blocks the classic SSRF targets a company-configured webhook URL could
// otherwise be pointed at: cloud metadata endpoints, the Docker network's
// own services, localhost, and other private/reserved ranges. Not an
// exhaustive IANA special-purpose registry — this covers the ranges that
// actually matter for this threat model (a server-side HTTP client making
// requests to an attacker-influenced URL).
function isPrivateOrReservedIPv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 — loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 — link-local, incl. cloud metadata (169.254.169.254)
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 100 && b !== undefined && b >= 64 && b <= 127) return true; // 100.64.0.0/10 — carrier-grade NAT
  return false;
}

function isPrivateOrReservedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true; // loopback
  if (normalized.startsWith("fe80:")) return true; // fe80::/10 — link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7 — unique local
  if (normalized.startsWith("::ffff:")) {
    // IPv4-mapped IPv6 (e.g. ::ffff:169.254.169.254) — check the embedded v4 address too.
    const embedded = normalized.slice("::ffff:".length);
    if (isIPv4(embedded)) return isPrivateOrReservedIPv4(embedded);
  }
  return false;
}

// Re-run this immediately before every delivery, not just when a webhook
// URL is saved — a hostname that resolved to a public IP at save time can
// be repointed at an internal address later ("DNS rebinding"), and only a
// check at request time catches that.
export async function assertPublicHttpsUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ValidationError("Enter a valid URL.");
  }

  if (url.protocol !== "https:") {
    throw new ValidationError("Webhook URLs must use HTTPS.");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local")) {
    throw new ValidationError("Webhook URLs can't point at a local address.");
  }

  if (isIPv4(hostname)) {
    if (isPrivateOrReservedIPv4(hostname)) {
      throw new ValidationError("Webhook URLs can't point at a private or reserved address.");
    }
    return;
  }
  if (isIPv6(hostname)) {
    if (isPrivateOrReservedIPv6(hostname)) {
      throw new ValidationError("Webhook URLs can't point at a private or reserved address.");
    }
    return;
  }

  let addresses;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new ValidationError("Could not resolve the webhook URL's hostname.");
  }
  for (const { address, family } of addresses) {
    const blocked = family === 4 ? isPrivateOrReservedIPv4(address) : isPrivateOrReservedIPv6(address);
    if (blocked) {
      throw new ValidationError("Webhook URLs can't point at a private or reserved address.");
    }
  }
}

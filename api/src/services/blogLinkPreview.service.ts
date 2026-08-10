// Chapter 17 — SSRF lab (INTENTIONAL, training only). Basic/in-band SSRF.
//
// "Link preview" for the blog comment Website field: fetches whatever URL is
// handed to it, server-side, using the platform fetch (undici) client, and
// hands the fetched response straight back to the caller. There is no
// host/IP allowlist and no scheme restriction beyond what `fetch` itself
// accepts — a comment's "Website" field (or any URL passed here directly) can
// point at an internal address (http://mailhog:8025/, http://report-service/,
// http://localhost:<port>/, cloud metadata, etc.) and this will faithfully
// fetch it and return the response for the caller to read. Contrast with
// ssrfGuard.ts's assertPublicHttpsUrl, used by the (separate, unrelated)
// webhooks feature — nothing here calls it.

const FETCH_TIMEOUT_MS = 8_000;
const MAX_BODY_CHARS = 20_000;

export interface LinkPreviewResult {
  url: string;
  statusCode: number;
  contentType: string | null;
  title: string | null;
  body: string;
}

function extractTitle(html: string): string | null {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match?.[1] ? match[1].trim().slice(0, 300) : null;
}

// Fetches `rawUrl` and returns its response verbatim (title + a bounded slice
// of the raw body) — no validation of the target host at all.
export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreviewResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(rawUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Kontora-LinkPreview/1.0" },
    });

    const contentType = res.headers.get("content-type");
    const text = await res.text();
    const body = text.slice(0, MAX_BODY_CHARS);

    return {
      url: rawUrl,
      statusCode: res.status,
      contentType,
      title: extractTitle(body),
      body,
    };
  } finally {
    clearTimeout(timeout);
  }
}

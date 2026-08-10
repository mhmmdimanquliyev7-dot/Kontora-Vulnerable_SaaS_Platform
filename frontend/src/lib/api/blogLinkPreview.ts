import { apiFetch } from "@/lib/api/client";

// Chapter 17 — SSRF lab (INTENTIONAL, training only). See
// api/src/services/blogLinkPreview.service.ts — this hits a public, no-auth
// endpoint that fetches whatever URL it's given server-side and returns the
// fetched response verbatim.

export interface LinkPreviewResult {
  url: string;
  statusCode: number;
  contentType: string | null;
  title: string | null;
  body: string;
}

export async function fetchLinkPreview(url: string): Promise<LinkPreviewResult> {
  const res = await apiFetch<{ preview: LinkPreviewResult }>("/api/blog/comments/link-preview", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
  return res.preview;
}

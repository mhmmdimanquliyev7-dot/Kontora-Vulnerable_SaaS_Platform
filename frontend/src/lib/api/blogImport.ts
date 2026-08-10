import { apiFetch } from "@/lib/api/client";

// Chapter 17 — SSRF lab (INTENTIONAL, training only). See
// api/src/services/blogImport.service.ts.

export interface ImportedPost {
  sourceUrl: string;
  title: string | null;
  excerpt: string;
  body: string;
}

export async function importPostFromUrl(url: string): Promise<ImportedPost> {
  const res = await apiFetch<{ imported: ImportedPost }>("/api/blog/admin/posts/import", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
  return res.imported;
}

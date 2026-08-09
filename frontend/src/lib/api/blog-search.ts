import { apiFetch } from "@/lib/api/client";
import type { BlogPostSummary } from "@/lib/api/types";

// Chapter 15 — XSS lab (INTENTIONAL, training only).

// Public blog search. Results are normal (React-escaped); the server logs the
// raw term (blind-XSS source).
export async function searchPosts(q: string): Promise<BlogPostSummary[]> {
  const res = await apiFetch<{ posts: BlogPostSummary[] }>(
    `/api/blog/search?q=${encodeURIComponent(q)}`,
  );
  return res.posts;
}

export interface BlogSearchLog {
  id: string;
  term: string;
  createdAt: string;
}

// Owner-only. Recent search terms, rendered as raw HTML by the admin panel
// (blind-XSS sink).
export async function getSearchLogs(): Promise<BlogSearchLog[]> {
  const res = await apiFetch<{ searches: BlogSearchLog[] }>("/api/blog/admin/search-logs");
  return res.searches;
}

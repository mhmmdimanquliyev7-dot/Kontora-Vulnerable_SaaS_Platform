import { apiFetch } from "@/lib/api/client";

// Chapter 15 — XSS lab (INTENTIONAL, training only). Public blog-post comments.
// `body` is returned verbatim by the API and rendered as raw HTML by the
// comment section (stored-XSS sink).

export interface BlogComment {
  id: string;
  authorName: string;
  website: string | null;
  body: string;
  createdAt: string;
}

export interface CreateCommentInput {
  authorName: string;
  website?: string;
  body: string;
}

export async function listComments(slug: string): Promise<BlogComment[]> {
  const res = await apiFetch<{ comments: BlogComment[] }>(
    `/api/blog/posts/${encodeURIComponent(slug)}/comments`,
  );
  return res.comments;
}

export async function createComment(
  slug: string,
  input: CreateCommentInput,
): Promise<BlogComment> {
  const res = await apiFetch<{ comment: BlogComment }>(
    `/api/blog/posts/${encodeURIComponent(slug)}/comments`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return res.comment;
}

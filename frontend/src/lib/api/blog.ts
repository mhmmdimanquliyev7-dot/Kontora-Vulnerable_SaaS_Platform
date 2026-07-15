import { apiFetch } from "@/lib/api/client";
import type {
  BlogPost,
  BlogPostDetail,
  BlogPostStatus,
  BlogPostSummary,
} from "@/lib/api/types";

// ---- Public (no auth) -----------------------------------------------------

export async function listPublicPosts(): Promise<BlogPostSummary[]> {
  const res = await apiFetch<{ posts: BlogPostSummary[] }>("/api/blog/posts");
  return res.posts;
}

export async function getPublicPost(slug: string): Promise<BlogPostDetail> {
  const res = await apiFetch<{ post: BlogPostDetail }>(
    `/api/blog/posts/${encodeURIComponent(slug)}`,
  );
  return res.post;
}

// ---- Admin ----------------------------------------------------------------

export interface BlogPostInput {
  title: string;
  body: string;
  excerpt?: string;
  status: BlogPostStatus;
}

export async function listAdminPosts(): Promise<BlogPost[]> {
  const res = await apiFetch<{ posts: BlogPost[] }>("/api/blog/admin/posts");
  return res.posts;
}

export async function getAdminPost(id: string): Promise<BlogPost> {
  const res = await apiFetch<{ post: BlogPost }>(`/api/blog/admin/posts/${id}`);
  return res.post;
}

export async function createPost(input: BlogPostInput): Promise<BlogPost> {
  const res = await apiFetch<{ post: BlogPost }>("/api/blog/admin/posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.post;
}

export async function updatePost(id: string, input: Partial<BlogPostInput>): Promise<BlogPost> {
  const res = await apiFetch<{ post: BlogPost }>(`/api/blog/admin/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.post;
}

export function deletePost(id: string): Promise<void> {
  return apiFetch(`/api/blog/admin/posts/${id}`, { method: "DELETE" });
}

export async function uploadPostCover(id: string, file: File): Promise<BlogPost> {
  const form = new FormData();
  form.append("image", file);
  const res = await apiFetch<{ post: BlogPost }>(`/api/blog/admin/posts/${id}/cover`, {
    method: "POST",
    body: form,
  });
  return res.post;
}

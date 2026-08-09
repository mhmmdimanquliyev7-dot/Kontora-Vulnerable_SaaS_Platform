import { NotFoundError } from "@/lib/errors.js";
import { prisma } from "@/lib/prisma.js";
import { BlogPostStatus } from "@kontora/db";

// Chapter 15 — XSS lab (INTENTIONAL, training only). Public blog-post comments.
// Comments are stored VERBATIM (no sanitization) and returned VERBATIM; the
// frontend renders each body as raw HTML, so a stored payload executes for
// every viewer of the post — the stored-XSS sink.

// Resolves a PUBLISHED post by its public slug. Comments are only attached to
// (and listed for) posts a visitor can actually see.
async function publishedPostIdBySlug(slug: string): Promise<string> {
  const post = await prisma.blogPost.findFirst({
    where: { slug, status: BlogPostStatus.PUBLISHED, publishedAt: { not: null } },
    select: { id: true },
  });
  if (!post) throw new NotFoundError("Post not found.");
  return post.id;
}

export interface BlogCommentInput {
  authorName: string;
  website?: string;
  body: string;
}

export async function listComments(slug: string) {
  const postId = await publishedPostIdBySlug(slug);
  const comments = await prisma.blogComment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
  });
  return comments.map((c) => ({
    id: c.id,
    authorName: c.authorName,
    website: c.website,
    // Stored verbatim, returned verbatim — the frontend injects this as raw HTML.
    body: c.body,
    createdAt: c.createdAt,
  }));
}

export async function createComment(slug: string, input: BlogCommentInput) {
  const postId = await publishedPostIdBySlug(slug);
  const comment = await prisma.blogComment.create({
    data: {
      postId,
      authorName: input.authorName,
      website: input.website,
      body: input.body,
    },
  });
  return {
    id: comment.id,
    authorName: comment.authorName,
    website: comment.website,
    body: comment.body,
    createdAt: comment.createdAt,
  };
}

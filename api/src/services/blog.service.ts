import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import slugify from "slugify";

import { NotFoundError, ValidationError } from "@/lib/errors.js";
import { renderMarkdown } from "@/lib/markdown.js";
import { prisma } from "@/lib/prisma.js";
import { BLOG_IMAGES_DIR } from "@/lib/uploads.js";
import { recordActivity } from "@/services/activity.service.js";
import { BlogPostStatus, type BlogPost } from "@kontora/db";

const COVER_MAX_DIMENSION = 1600;

// A base slug from the title, plus a short random suffix on collision. slug is
// globally unique (the public /blog/[slug] URL has no company segment), so we
// can't assume a title is unique within one tenant even — the random suffix
// makes a second post titled the same resolve to its own URL rather than
// failing, and stops one tenant from predicting/squatting another's slug.
async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title, { lower: true, strict: true }).slice(0, 80) || "post";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 8)}`;
    const existing = await prisma.blogPost.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
  }
  // Fall back to an all-random slug rather than loop forever.
  return `${base}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---- Public read path (no auth) ------------------------------------------

// Only PUBLISHED posts are ever returned here, across all tenants — the public
// marketing blog. No company scoping filter: a visitor isn't a member of any
// tenant. DRAFT posts are invisible to this path entirely.
export async function listPublishedPosts() {
  const posts = await prisma.blogPost.findMany({
    where: { status: BlogPostStatus.PUBLISHED, publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    include: { company: { select: { name: true } }, author: { select: { name: true } } },
  });
  return posts.map(publicListView);
}

export async function getPublishedPostBySlug(slug: string) {
  const post = await prisma.blogPost.findFirst({
    where: { slug, status: BlogPostStatus.PUBLISHED, publishedAt: { not: null } },
    include: {
      company: { select: { name: true, description: true } },
      author: { select: { name: true } },
    },
  });
  if (!post) throw new NotFoundError("Post not found.");
  return publicDetailView(post);
}

type PostWithRelations = BlogPost & {
  company: { name: string; description?: string | null };
  author: { name: string } | null;
};

function publicListView(post: PostWithRelations) {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImageUrl: post.coverImageUrl,
    publishedAt: post.publishedAt,
    companyName: post.company.name,
    authorName: post.author?.name ?? null,
  };
}

function publicDetailView(post: PostWithRelations) {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImageUrl: post.coverImageUrl,
    publishedAt: post.publishedAt,
    companyName: post.company.name,
    // The authoring company's free-text bio, shown as an "about the author"
    // box. Plain text (React-escaped on render), never HTML.
    companyDescription: post.company.description ?? null,
    authorName: post.author?.name ?? null,
    // Rendered + sanitized here, in the trusted layer — the frontend renders
    // this string directly and does not (and must not) re-sanitize.
    bodyHtml: renderMarkdown(post.body),
  };
}

// ---- Admin path (auth + OWNER/ACCOUNTANT, tenant-scoped) ------------------

// Admin always operates within the caller's own company. A post id from
// another tenant simply doesn't match the companyId filter and reads as a 404.
export async function listCompanyPosts(companyId: string) {
  return prisma.blogPost.findMany({
    where: { companyId },
    orderBy: { updatedAt: "desc" },
    include: { author: { select: { name: true } } },
  });
}

export async function getCompanyPost(companyId: string, postId: string) {
  const post = await prisma.blogPost.findFirst({ where: { id: postId, companyId } });
  if (!post) throw new NotFoundError("Post not found.");
  return post;
}

export interface BlogPostInput {
  title: string;
  body: string;
  excerpt?: string;
  status: BlogPostStatus;
}

export async function createPost(companyId: string, authorId: string, input: BlogPostInput) {
  const slug = await generateUniqueSlug(input.title);
  const publishedAt = input.status === BlogPostStatus.PUBLISHED ? new Date() : null;

  const post = await prisma.blogPost.create({
    data: {
      companyId,
      authorId,
      title: input.title,
      slug,
      body: input.body,
      excerpt: input.excerpt,
      status: input.status,
      publishedAt,
    },
  });

  await recordActivity({
    companyId,
    userId: authorId,
    action: "blog.post_created",
    entityType: "BlogPost",
    entityId: post.id,
    metadata: { title: post.title, status: post.status },
  });
  return post;
}

export async function updatePost(
  companyId: string,
  actorUserId: string,
  postId: string,
  input: Partial<BlogPostInput>,
) {
  const existing = await getCompanyPost(companyId, postId);

  // Stamp publishedAt the first time a post transitions into PUBLISHED, and
  // leave it stable on subsequent edits so the public "published on" date
  // doesn't jump every time the post is touched.
  let publishedAt = existing.publishedAt;
  if (input.status === BlogPostStatus.PUBLISHED && existing.status !== BlogPostStatus.PUBLISHED) {
    publishedAt = new Date();
  } else if (input.status === BlogPostStatus.DRAFT) {
    publishedAt = null;
  }

  const post = await prisma.blogPost.update({
    where: { id: postId },
    data: {
      title: input.title,
      body: input.body,
      excerpt: input.excerpt,
      status: input.status,
      publishedAt,
    },
  });

  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "blog.post_updated",
    entityType: "BlogPost",
    entityId: post.id,
    metadata: { title: post.title, status: post.status },
  });
  return post;
}

export async function deletePost(companyId: string, actorUserId: string, postId: string) {
  const existing = await getCompanyPost(companyId, postId);

  if (existing.coverImageUrl) {
    await removeCoverFile(existing.coverImageUrl);
  }
  await prisma.blogPost.delete({ where: { id: postId } });

  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "blog.post_deleted",
    entityType: "BlogPost",
    entityId: postId,
    metadata: { title: existing.title },
  });
}

// Cover image: same server-generated-name + sharp re-encode approach as the
// company logo. The stored filename is derived from the post id only, never
// from the uploaded filename, so there's no path-traversal surface; sharp
// rejects anything that isn't a decodable raster image.
export async function setCoverImage(
  companyId: string,
  actorUserId: string,
  postId: string,
  fileBuffer: Buffer,
) {
  const post = await getCompanyPost(companyId, postId);

  let encoded: Buffer;
  try {
    encoded = await sharp(fileBuffer)
      .resize(COVER_MAX_DIMENSION, COVER_MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new ValidationError("The uploaded file is not a valid image.");
  }

  await mkdir(BLOG_IMAGES_DIR, { recursive: true });
  const filename = `${post.id}.webp`;
  await writeFile(path.join(BLOG_IMAGES_DIR, filename), encoded);

  const coverImageUrl = `/uploads/blog/${filename}`;
  const updated = await prisma.blogPost.update({
    where: { id: postId },
    data: { coverImageUrl },
  });

  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "blog.cover_updated",
    entityType: "BlogPost",
    entityId: postId,
  });
  return updated;
}

async function removeCoverFile(coverImageUrl: string): Promise<void> {
  // coverImageUrl is always a value this service generated
  // (/uploads/blog/<postId>.webp); take only the basename defensively so a
  // stored value can never walk outside BLOG_IMAGES_DIR.
  const filename = path.basename(coverImageUrl);
  try {
    await unlink(path.join(BLOG_IMAGES_DIR, filename));
  } catch {
    // Best-effort: a missing file shouldn't block the delete.
  }
}

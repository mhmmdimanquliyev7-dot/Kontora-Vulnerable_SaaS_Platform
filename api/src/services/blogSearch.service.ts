import { prisma } from "@/lib/prisma.js";
import { BlogPostStatus } from "@kontora/db";

// Chapter 15 — XSS lab (INTENTIONAL, training only). Public blog search.
//
// The search RESULTS are produced with a normal parameterized Prisma query
// (no injection there). The blind-XSS sink is the LOGGING side effect: every
// raw search term is persisted verbatim to blog_search_logs, and the owner-only
// "recent searches" panel later renders each term as raw HTML. A payload typed
// into the public search box therefore lies dormant until an owner opens the
// panel, then executes in the admin's browser.

export async function searchPublishedPosts(rawTerm: string) {
  const term = rawTerm.trim();

  // Log the raw term (verbatim) with a timestamp — the dormant blind-XSS
  // payload lands here. Empty searches aren't logged.
  if (term.length > 0) {
    await prisma.blogSearchLog.create({ data: { term: rawTerm } });
  }

  if (term.length === 0) return [];

  const posts = await prisma.blogPost.findMany({
    where: {
      status: BlogPostStatus.PUBLISHED,
      publishedAt: { not: null },
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { excerpt: { contains: term, mode: "insensitive" } },
      ],
    },
    orderBy: { publishedAt: "desc" },
    include: { company: { select: { name: true } }, author: { select: { name: true } } },
  });

  return posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImageUrl: post.coverImageUrl,
    publishedAt: post.publishedAt,
    companyName: post.company.name,
    authorName: post.author?.name ?? null,
  }));
}

// Owner-only. Most recent search terms, returned verbatim for the admin panel
// to render as raw HTML.
export async function listRecentSearchTerms(limit = 50) {
  const logs = await prisma.blogSearchLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return logs.map((log) => ({ id: log.id, term: log.term, createdAt: log.createdAt }));
}

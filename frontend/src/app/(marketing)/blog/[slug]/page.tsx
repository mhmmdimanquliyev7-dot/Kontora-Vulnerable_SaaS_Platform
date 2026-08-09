"use client";

import { ArrowLeft, Newspaper } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { use } from "react";

import { Button } from "@/components/ui/button";
import { CommentSection } from "@/components/blog/comment-section";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicPost } from "@/hooks/use-blog";
import { ApiError } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/client";

function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const post = usePublicPost(slug);

  if (post.isPending) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-16 sm:px-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (post.isError || !post.data) {
    const notFound = post.error instanceof ApiError && post.error.status === 404;
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={Newspaper}
          title={notFound ? "Post not found" : "Couldn't load this post"}
          description={notFound ? "It may have been unpublished or removed." : undefined}
          action={
            <Button variant="outline" asChild>
              <Link href="/blog">
                <ArrowLeft className="size-4" />
                Back to blog
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const data = post.data;

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/blog"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Blog
      </Link>

      <p className="text-xs text-muted-foreground">
        {data.companyName}
        {data.authorName && <> · {data.authorName}</>}
        {data.publishedAt && <> · {formatDate(data.publishedAt)}</>}
      </p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-balance">{data.title}</h1>
      {data.excerpt && <p className="mt-4 text-lg text-muted-foreground">{data.excerpt}</p>}

      {data.coverImageUrl && (
        <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-2xl border bg-muted">
          <Image src={apiUrl(data.coverImageUrl)} alt="" fill unoptimized className="object-cover" />
        </div>
      )}

      {/* bodyHtml is rendered + sanitized server-side (api/src/lib/markdown.ts).
          It is deliberately NOT re-processed here. */}
      <div
        className="kontora-prose mt-10"
        dangerouslySetInnerHTML={{ __html: data.bodyHtml }}
      />

      {data.companyDescription && (
        <div className="mt-12 rounded-2xl border bg-muted/30 p-6">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            About {data.companyName}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {data.companyDescription}
          </p>
        </div>
      )}

      <CommentSection slug={slug} />
    </article>
  );
}

"use client";

import { ArrowRight, Newspaper } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicPosts } from "@/hooks/use-blog";
import { apiUrl } from "@/lib/api/client";

function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogIndexPage() {
  const posts = usePublicPosts();

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(65%_60%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_10%,transparent),transparent)]"
        />
        <div className="mx-auto w-full max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <p className="text-sm font-semibold tracking-wider text-primary uppercase">Blog</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            News, guides, and ideas
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Practical writing on invoicing, running a small business, and getting paid on time.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6">
        {posts.isPending ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : posts.data && posts.data.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {posts.data.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                  {post.coverImageUrl ? (
                    <Image
                      src={apiUrl(post.coverImageUrl)}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-violet-500/10">
                      <Newspaper className="size-10 text-primary/40" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-xs text-muted-foreground">
                    {post.companyName}
                    {post.publishedAt && <> · {formatDate(post.publishedAt)}</>}
                  </p>
                  <h2 className="mt-2 font-heading text-lg font-semibold tracking-tight">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">
                      {post.excerpt}
                    </p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Read more
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Newspaper}
            title="No posts yet"
            description="Check back soon — new writing is on the way."
          />
        )}
      </section>
    </>
  );
}

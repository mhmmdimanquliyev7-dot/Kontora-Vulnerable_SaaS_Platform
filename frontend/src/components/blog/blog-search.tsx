"use client";

import { useMutation } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { searchPosts } from "@/lib/api/blog-search";
import type { BlogPostSummary } from "@/lib/api/types";

// Chapter 15 — XSS lab (INTENTIONAL, training only). Blind-XSS SOURCE: the raw
// term is logged server-side on every search. The results shown here are
// normal/escaped — the payload does not reflect on the public blog; it detonates
// later in the owner's "recent searches" panel.
export function BlogSearch() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<BlogPostSummary[] | null>(null);

  const run = useMutation({
    mutationFn: () => searchPosts(term),
    onSuccess: (posts) => setResults(posts),
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Search failed."),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!term.trim()) {
      setResults(null);
      return;
    }
    run.mutate();
  }

  return (
    <div className="mx-auto mb-10 w-full max-w-xl">
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search the blog…"
          aria-label="Search the blog"
        />
        <Button type="submit" disabled={run.isPending}>
          <Search className="size-4" />
          {run.isPending ? "Searching…" : "Search"}
        </Button>
      </form>

      {results !== null && (
        <div className="mt-4 rounded-xl border bg-card p-4">
          {results.length > 0 ? (
            <ul className="space-y-3">
              {results.map((post) => (
                <li key={post.slug}>
                  <Link href={`/blog/${post.slug}`} className="font-medium hover:text-primary">
                    {post.title}
                  </Link>
                  {post.excerpt && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No posts matched “{term}”.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

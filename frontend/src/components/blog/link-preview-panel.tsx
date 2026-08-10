"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Link2, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { listComments } from "@/lib/api/comments";
import { fetchLinkPreview, type LinkPreviewResult } from "@/lib/api/blogLinkPreview";

// Chapter 17 — SSRF lab (INTENTIONAL, training only). A "link preview" for
// each commenter's Website field, fetched server-side (see
// api/src/services/blogLinkPreview.service.ts) — the classic Slack/Discord-
// style unfurl. The fetch has no host/IP allowlist, so pointing a comment's
// Website field at an internal service and previewing it returns that
// service's response here. Deliberately a standalone panel rather than a
// change to CommentSection (comment-section.tsx is chapter 15's stored-XSS
// lab and is left untouched).
export function LinkPreviewPanel({ slug }: { slug: string }) {
  const comments = useQuery({
    queryKey: ["blog", "comments", slug],
    queryFn: () => listComments(slug),
  });

  const withWebsite = (comments.data ?? []).filter((c) => c.website);
  if (withWebsite.length === 0) return null;

  return (
    <section className="mt-8 rounded-xl border bg-muted/20 p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-medium">
        <Link2 className="size-4" />
        Link previews
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Fetch a live preview of the website a commenter linked.
      </p>
      <ul className="mt-4 space-y-3">
        {withWebsite.map((comment) => (
          <LinkPreviewRow key={comment.id} authorName={comment.authorName} url={comment.website!} />
        ))}
      </ul>
    </section>
  );
}

function LinkPreviewRow({ authorName, url }: { authorName: string; url: string }) {
  const [result, setResult] = useState<LinkPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = useMutation({
    mutationFn: () => fetchLinkPreview(url),
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Couldn't fetch a preview."),
  });

  return (
    <li className="rounded-lg border bg-card p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{authorName}</p>
          <p className="truncate text-xs text-muted-foreground">{url}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={preview.isPending}
          onClick={() => preview.mutate()}
        >
          {preview.isPending && <Loader2 className="size-3.5 animate-spin" />}
          Preview
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      {result && (
        <div className="mt-3 space-y-1 rounded-md border bg-muted/40 p-2.5 text-xs">
          <p className="text-muted-foreground">
            HTTP {result.statusCode}
            {result.contentType && <> · {result.contentType}</>}
          </p>
          {result.title && <p className="font-medium">{result.title}</p>}
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-muted-foreground">
            {result.body}
          </pre>
        </div>
      )}
    </li>
  );
}

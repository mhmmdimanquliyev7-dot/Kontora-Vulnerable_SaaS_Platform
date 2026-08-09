"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { createComment, listComments } from "@/lib/api/comments";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Chapter 15 — XSS lab (INTENTIONAL, training only). Stored-XSS sink: every
// comment body is injected as raw HTML via dangerouslySetInnerHTML, so a stored
// payload executes for everyone who views the post (including an admin).
export function CommentSection({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const comments = useQuery({
    queryKey: ["blog", "comments", slug],
    queryFn: () => listComments(slug),
  });

  const [authorName, setAuthorName] = useState("");
  const [website, setWebsite] = useState("");
  const [body, setBody] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      createComment(slug, {
        authorName,
        website: website.trim() ? website : undefined,
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog", "comments", slug] });
      setAuthorName("");
      setWebsite("");
      setBody("");
      toast.success("Comment posted");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Couldn't post your comment."),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim() || !body.trim()) {
      toast.error("Name and comment are required.");
      return;
    }
    submit.mutate();
  }

  const list = comments.data ?? [];

  return (
    <section className="mt-16 border-t pt-10">
      <h2 className="text-xl font-semibold tracking-tight">
        Comments{list.length > 0 && <span className="text-muted-foreground"> ({list.length})</span>}
      </h2>

      {comments.isPending ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : list.length > 0 ? (
        <ul className="mt-6 space-y-6">
          {list.map((comment) => (
            <li key={comment.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">
                  {comment.website ? (
                    <a
                      href={comment.website}
                      className="text-primary hover:underline"
                      rel="nofollow noreferrer"
                    >
                      {comment.authorName}
                    </a>
                  ) : (
                    comment.authorName
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
              </div>
              {/* Chapter 15 — stored-XSS sink: comment body rendered as raw HTML. */}
              <div
                className="kontora-prose mt-2 text-sm"
                dangerouslySetInnerHTML={{ __html: comment.body }}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          No comments yet. Be the first to share your thoughts.
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-10 space-y-4 rounded-xl border bg-muted/30 p-5">
        <h3 className="font-medium">Leave a comment</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="comment-name">Name</Label>
            <Input
              id="comment-name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="comment-website">Website (optional)</Label>
            <Input
              id="comment-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://your-site.com"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="comment-body">Comment</Label>
          <Textarea
            id="comment-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your thoughts…"
            rows={4}
          />
        </div>
        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending ? "Posting…" : "Post comment"}
        </Button>
      </form>
    </section>
  );
}

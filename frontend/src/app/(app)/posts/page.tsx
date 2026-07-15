"use client";

import { ExternalLink, Lock, Newspaper, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useAdminPosts, useDeletePost } from "@/hooks/use-blog";
import { useMe } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import type { BlogPost } from "@/lib/api/types";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminBlogPage() {
  const { data: me } = useMe();
  const canManage = me?.role === "OWNER" || me?.role === "ACCOUNTANT";

  const posts = useAdminPosts(canManage);
  const deletePost = useDeletePost();
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deletePost.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong");
    }
  }

  if (!canManage) {
    return (
      <div className="space-y-6">
        <PageHeader title="Blog" description="Write and publish posts to your public blog." />
        <EmptyState
          icon={Lock}
          title="Owners and accountants only"
          description="Blog posts are managed by workspace owners and accountants."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog"
        description="Write and publish posts to your public blog."
        actions={
          <Button asChild>
            <Link href="/posts/new">
              <Plus className="size-4" />
              New post
            </Link>
          </Button>
        }
      />

      {posts.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : posts.data && posts.data.length > 0 ? (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.data.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell>
                    <Badge variant={post.status === "PUBLISHED" ? "default" : "secondary"}>
                      {post.status === "PUBLISHED" ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(post.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {post.status === "PUBLISHED" && (
                        <Button variant="ghost" size="icon" className="size-8" asChild>
                          <Link href={`/blog/${post.slug}`} target="_blank" title="View public post">
                            <ExternalLink className="size-4" />
                          </Link>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="size-8" asChild>
                        <Link href={`/posts/${post.id}/edit`} title="Edit">
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Delete"
                        onClick={() => setDeleteTarget(post)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={Newspaper}
          title="No posts yet"
          description="Write your first post to share news and guides on your public blog."
          action={
            <Button asChild>
              <Link href="/posts/new">
                <Plus className="size-4" />
                New post
              </Link>
            </Button>
          }
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete post?"
        description={`This will permanently delete "${deleteTarget?.title}".`}
        confirmLabel="Delete"
        loading={deletePost.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

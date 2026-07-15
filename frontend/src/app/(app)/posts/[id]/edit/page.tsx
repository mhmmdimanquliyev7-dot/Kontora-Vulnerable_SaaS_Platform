"use client";

import { FileX2 } from "lucide-react";
import Link from "next/link";
import { use } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PostEditor } from "@/components/blog/post-editor";
import { EmptyState } from "@/components/shared/empty-state";
import { useAdminPost } from "@/hooks/use-blog";
import { ApiError } from "@/lib/api/client";

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const post = useAdminPost(id);

  if (post.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (post.isError || !post.data) {
    const notFound = post.error instanceof ApiError && post.error.status === 404;
    return (
      <EmptyState
        icon={FileX2}
        title={notFound ? "Post not found" : "Couldn't load this post"}
        description={notFound ? "It may have been deleted." : undefined}
        action={
          <Button variant="outline" asChild>
            <Link href="/posts">Back to posts</Link>
          </Button>
        }
      />
    );
  }

  return <PostEditor post={post.data} />;
}

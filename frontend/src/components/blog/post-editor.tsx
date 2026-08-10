"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Import, ImagePlus, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { useCreatePost, useUpdatePost, useUploadPostCover } from "@/hooks/use-blog";
import { useImportPostFromUrl } from "@/hooks/use-blog-import";
import { apiUrl } from "@/lib/api/client";
import type { BlogPost, BlogPostStatus } from "@/lib/api/types";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const postSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  excerpt: z.string().trim().max(500).optional(),
  body: z.string().trim().min(1, "Body is required").max(50_000),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

type PostValues = z.infer<typeof postSchema>;

export function PostEditor({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const isEdit = !!post;

  const createPost = useCreatePost();
  const updatePost = useUpdatePost(post?.id ?? "");
  const uploadCover = useUploadPostCover(post?.id ?? "");
  const importFromUrl = useImportPostFromUrl();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [importUrl, setImportUrl] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PostValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: post?.title ?? "",
      excerpt: post?.excerpt ?? "",
      body: post?.body ?? "",
      status: post?.status ?? "DRAFT",
    },
  });

  const status = watch("status");

  async function handleImport() {
    if (!importUrl.trim()) return;
    const imported = await importFromUrl.mutateAsync(importUrl.trim());
    if (imported.title) setValue("title", imported.title, { shouldValidate: true });
    setValue("excerpt", imported.excerpt, { shouldValidate: true });
    setValue("body", imported.body, { shouldValidate: true });
  }

  async function onSubmit(values: PostValues) {
    const input = {
      title: values.title,
      excerpt: values.excerpt || undefined,
      body: values.body,
      status: values.status as BlogPostStatus,
    };
    if (isEdit) {
      await updatePost.mutateAsync(input);
    } else {
      const created = await createPost.mutateAsync(input);
      router.push(`/posts/${created.id}/edit`);
    }
  }

  function handleCoverChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return;
    if (file.size > MAX_IMAGE_BYTES) return;
    uploadCover.mutate(file);
  }

  const saving = createPost.isPending || updatePost.isPending;

  return (
    <div className="space-y-6">
      <Link
        href="/posts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Blog posts
      </Link>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isEdit ? "Edit post" : "New post"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                label="Import from URL"
                htmlFor="import-url"
                hint="Fetch an external article server-side and prefill the fields below."
              >
                <div className="flex gap-2">
                  <Input
                    id="import-url"
                    placeholder="https://example.com/some-article"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={importFromUrl.isPending || !importUrl.trim()}
                    onClick={handleImport}
                  >
                    {importFromUrl.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Import className="size-4" />
                    )}
                    Import
                  </Button>
                </div>
              </FormField>
              <FormField label="Title" htmlFor="title" error={errors.title?.message} required>
                <Input id="title" {...register("title")} />
              </FormField>
              <FormField
                label="Excerpt"
                htmlFor="excerpt"
                error={errors.excerpt?.message}
                hint="A one- or two-sentence summary shown on the blog index."
              >
                <Textarea id="excerpt" rows={2} {...register("excerpt")} />
              </FormField>
              <FormField
                label="Body (Markdown)"
                htmlFor="body"
                error={errors.body?.message}
                hint="Markdown is supported. It's rendered to sanitized HTML when published."
                required
              >
                <Textarea id="body" rows={18} className="font-mono text-sm" {...register("body")} />
              </FormField>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publish</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Status" htmlFor="status">
                <Select
                  value={status}
                  onValueChange={(v) => setValue("status", v as BlogPostStatus)}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {isEdit ? "Save changes" : "Create post"}
              </Button>
              {status === "PUBLISHED" && (
                <p className="text-xs text-muted-foreground">
                  Published posts are visible to everyone on the public blog.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cover image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {post?.coverImageUrl ? (
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border bg-muted">
                  <Image
                    src={apiUrl(post.coverImageUrl)}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center rounded-lg border border-dashed bg-muted/40 text-muted-foreground">
                  <ImagePlus className="size-6" />
                </div>
              )}
              {isEdit ? (
                <>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleCoverChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={uploadCover.isPending}
                    onClick={() => coverInputRef.current?.click()}
                  >
                    {uploadCover.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ImagePlus className="size-4" />
                    )}
                    Upload cover
                  </Button>
                  <p className="text-xs text-muted-foreground">PNG, JPEG, or WebP. Max 2MB.</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Save the post first, then you can add a cover image.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

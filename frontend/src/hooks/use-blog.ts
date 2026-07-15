import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as blogApi from "@/lib/api/blog";
import { ApiError } from "@/lib/api/client";

// ---- Public ---------------------------------------------------------------

export function usePublicPosts() {
  return useQuery({ queryKey: ["blog", "public", "list"], queryFn: blogApi.listPublicPosts });
}

export function usePublicPost(slug: string) {
  return useQuery({
    queryKey: ["blog", "public", "detail", slug],
    queryFn: () => blogApi.getPublicPost(slug),
  });
}

// ---- Admin ----------------------------------------------------------------

export function useAdminPosts(enabled = true) {
  return useQuery({
    queryKey: ["blog", "admin", "list"],
    queryFn: blogApi.listAdminPosts,
    enabled,
  });
}

export function useAdminPost(id: string | undefined) {
  return useQuery({
    queryKey: ["blog", "admin", "detail", id],
    queryFn: () => blogApi.getAdminPost(id!),
    enabled: !!id,
  });
}

function invalidateBlog(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["blog"] });
  queryClient.invalidateQueries({ queryKey: ["activity"] });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blogApi.createPost,
    onSuccess: () => {
      invalidateBlog(queryClient);
      toast.success("Post created");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

export function useUpdatePost(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof blogApi.updatePost>[1]) => blogApi.updatePost(id, input),
    onSuccess: () => {
      invalidateBlog(queryClient);
      toast.success("Post saved");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blogApi.deletePost,
    onSuccess: () => {
      invalidateBlog(queryClient);
      toast.success("Post deleted");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

export function useUploadPostCover(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => blogApi.uploadPostCover(id, file),
    onSuccess: () => {
      invalidateBlog(queryClient);
      toast.success("Cover image updated");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

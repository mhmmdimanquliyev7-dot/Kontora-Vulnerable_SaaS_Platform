import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as attachmentsApi from "@/lib/api/attachments";
import { ApiError } from "@/lib/api/client";

export function useAttachments(invoiceId: string) {
  return useQuery({
    queryKey: ["attachments", invoiceId],
    queryFn: () => attachmentsApi.listAttachments(invoiceId),
  });
}

export function useUploadAttachment(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => attachmentsApi.uploadAttachment(invoiceId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", invoiceId] });
      toast.success("File attached");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

export function useDeleteAttachment(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => attachmentsApi.deleteAttachment(invoiceId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", invoiceId] });
      toast.success("Attachment removed");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

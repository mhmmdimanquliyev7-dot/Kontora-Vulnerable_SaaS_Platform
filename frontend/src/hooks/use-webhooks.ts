import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/client";
import * as webhooksApi from "@/lib/api/webhooks";

export function useWebhooks(enabled = true) {
  return useQuery({ queryKey: ["webhooks"], queryFn: webhooksApi.listWebhooks, enabled });
}

export function useWebhookDeliveries(id: string | undefined) {
  return useQuery({
    queryKey: ["webhooks", id, "deliveries"],
    queryFn: () => webhooksApi.getWebhookDeliveries(id!),
    enabled: !!id,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: webhooksApi.createWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook created");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

export function useUpdateWebhook(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof webhooksApi.updateWebhook>[1]) =>
      webhooksApi.updateWebhook(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook updated");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: webhooksApi.deleteWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook deleted");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

export function useTestWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: webhooksApi.testWebhook,
    onSuccess: (result, id) => {
      queryClient.invalidateQueries({ queryKey: ["webhooks", id, "deliveries"] });
      if (result.success) {
        toast.success(`Test delivered — received a ${result.statusCode} response`);
      } else {
        toast.error(result.errorMessage ?? `Test failed (status ${result.statusCode ?? "n/a"})`);
      }
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

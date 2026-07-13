import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/client";
import * as invoicesApi from "@/lib/api/invoices";
import type { InvoiceStatus } from "@/lib/api/types";

export function useInvoices(params: invoicesApi.ListInvoicesParams = {}) {
  return useQuery({
    queryKey: ["invoices", "list", params.status ?? "", params.clientId ?? ""],
    queryFn: () => invoicesApi.listInvoices(params),
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["invoices", "detail", id],
    queryFn: () => invoicesApi.getInvoice(id!),
    enabled: !!id,
  });
}

function invalidateInvoices(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["invoices"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["activity"] });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: invoicesApi.createInvoice,
    onSuccess: () => {
      invalidateInvoices(queryClient);
      toast.success("Invoice created");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

export function useUpdateInvoice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: invoicesApi.InvoiceInput) => invoicesApi.updateInvoice(id, input),
    onSuccess: () => {
      invalidateInvoices(queryClient);
      toast.success("Invoice updated");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      invoicesApi.updateInvoiceStatus(id, status),
    onSuccess: () => {
      invalidateInvoices(queryClient);
      toast.success("Invoice status updated");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: invoicesApi.deleteInvoice,
    onSuccess: () => {
      invalidateInvoices(queryClient);
      toast.success("Invoice deleted");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

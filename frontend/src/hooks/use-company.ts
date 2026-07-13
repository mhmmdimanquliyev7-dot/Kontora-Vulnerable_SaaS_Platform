import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/client";
import * as companyApi from "@/lib/api/company";
import { meQueryKey } from "@/hooks/use-auth";

export function useCompany() {
  return useQuery({ queryKey: ["company"], queryFn: companyApi.getCompany });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: companyApi.updateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      queryClient.invalidateQueries({ queryKey: meQueryKey });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast.success("Company profile updated");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

export function useUploadCompanyLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: companyApi.uploadCompanyLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      queryClient.invalidateQueries({ queryKey: meQueryKey });
      toast.success("Logo updated");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Something went wrong"),
  });
}

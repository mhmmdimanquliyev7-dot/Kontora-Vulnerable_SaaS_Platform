import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as authApi from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export const meQueryKey = ["auth", "me"] as const;

export function useMe(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: authApi.me,
    enabled: options.enabled ?? true,
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  return useMutation({ mutationFn: authApi.login });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
  });
}

export function useSelectCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.selectCompany,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
  });
}

export function useSwitchCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.switchCompany,
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useLogoutAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logoutAll,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authApi.forgotPassword });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authApi.resetPassword(token, password),
  });
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

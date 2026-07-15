import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import * as authApi from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export const meQueryKey = ["auth", "me"] as const;

// Wipes every cached query. Must run on EVERY auth transition — login,
// register, company selection/switch, and logout.
//
// Why the whole cache and not just meQueryKey: the QueryClient is created once
// in Providers (the root layout) and survives client-side navigation, so
// router.push("/portal") after a login does NOT reset it. Anything still in
// the cache at that point belongs to the *previous* user — both their `me`
// (which AppShell/PortalShell read to decide admin-vs-portal) and every
// tenant-scoped list they loaded.
//
// Why removeQueries() and not invalidateQueries(): invalidate marks data stale
// but keeps serving it while it refetches, which is exactly the leak — the
// shells would still render a decision based on the old role. removeQueries()
// drops the data outright, so useMe() starts from `isPending` and the shells
// show a skeleton until the new user's real role arrives.
//
// Why not clear(): clear() also wipes the mutation cache, and these all run
// inside a mutation's own lifecycle. removeQueries() is the surgical version.
function resetSessionCache(queryClient: QueryClient): void {
  queryClient.removeQueries();
}

export function useMe(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: authApi.me,
    enabled: options.enabled ?? true,
    retry: false,
    staleTime: 60_000,
  });
}

// The identity this browser is authenticated as changes here, so the previous
// user's cached data must not survive into the new session. Without this reset
// a login that lands on /portal or /dashboard would be greeted by the previous
// user's cached `me` — which useMe() serves as fresh for staleTime (60s)
// without hitting the network — and the shells would route on the stale role.
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    // Runs before mutateAsync resolves, so the cache is already empty by the
    // time the login form redirects.
    onSuccess: () => resetSessionCache(queryClient),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: () => resetSessionCache(queryClient),
  });
}

export function useSelectCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.selectCompany,
    onSuccess: () => resetSessionCache(queryClient),
  });
}

// Switching workspace changes both the tenant and the caller's role in it, so
// every tenant-scoped query is invalid — not just `me`.
export function useSwitchCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.switchCompany,
    onSuccess: () => resetSessionCache(queryClient),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    // onSettled, not onSuccess: if the logout request itself fails (the access
    // token had already expired, a network blip), the user still asked to log
    // out. Keeping the old session's data cached in that case is precisely how
    // it leaks into whoever logs in next.
    onSettled: () => resetSessionCache(queryClient),
  });
}

export function useLogoutAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logoutAll,
    onSettled: () => resetSessionCache(queryClient),
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

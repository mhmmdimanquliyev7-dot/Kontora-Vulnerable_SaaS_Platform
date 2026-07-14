"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppTopbar } from "@/components/layout/app-topbar";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Logo } from "@/components/shared/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/use-auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: me, isPending, isError } = useMe();

  // CLIENT_GUEST never sees the internal admin app — the backend already
  // scopes everything it could reach here to just their own client's data,
  // but the client portal (its own shell, see PortalShell) is the intended
  // experience for that role, not this one.
  useEffect(() => {
    if (me?.role === "CLIENT_GUEST") {
      router.replace("/portal");
    }
  }, [me, router]);

  if (isPending || isError || !me || me.role === "CLIENT_GUEST") {
    // On error, the SessionExpiredListener (fed by apiFetch's 401 handling)
    // takes care of the redirect to /login — this just avoids a flash of
    // empty shell while that (or the CLIENT_GUEST redirect above) happens.
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="w-full max-w-sm space-y-3 px-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-60 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Logo />
        </div>
        <div className="flex flex-1 flex-col py-4">
          <SidebarNav role={me.role} />
        </div>
        <div className="border-t border-sidebar-border p-3 text-xs text-sidebar-foreground/60">
          Signed in as {me.role.toLowerCase().replace("_", " ")}
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <AppTopbar me={me} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

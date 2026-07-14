"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/shared/logo";
import { useLogout, useMe } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";

// The client-facing portal — deliberately its own shell, not AppShell with
// a restricted nav: a client should never see anything that looks like the
// internal admin app, even though the backend already scopes every
// response here to just their own data (invoiceRouter + invoice.service.ts
// CLIENT_GUEST restriction) regardless of which UI asks.
export function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: me, isPending, isError } = useMe();
  const logout = useLogout();

  useEffect(() => {
    if (me && me.role !== "CLIENT_GUEST") {
      router.replace("/dashboard");
    }
  }, [me, router]);

  if (isPending || isError || !me || me.role !== "CLIENT_GUEST") {
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

  async function handleLogout() {
    try {
      await logout.mutateAsync();
      router.push("/login");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong");
    }
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4">
          <Logo />
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            Client Portal
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {me.company.name}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="size-4" />
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}

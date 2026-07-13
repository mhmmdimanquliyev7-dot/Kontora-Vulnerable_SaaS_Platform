"use client";

import { Building2, Check, ChevronsUpDown, LogOut, Menu, ShieldOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/shared/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useLogout, useLogoutAll } from "@/hooks/use-auth";
import { useSwitchCompany } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import { initials } from "@/lib/format";
import type { MeResult } from "@/lib/api/types";

export function AppTopbar({ me }: { me: MeResult }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const logout = useLogout();
  const logoutAll = useLogoutAll();
  const switchCompany = useSwitchCompany();

  async function handleLogout(all: boolean) {
    try {
      await (all ? logoutAll.mutateAsync() : logout.mutateAsync());
      router.push("/login");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong");
    }
  }

  async function handleSwitchCompany(companyId: string) {
    if (companyId === me.company.id) return;
    try {
      await switchCompany.mutateAsync(companyId);
      toast.success("Switched workspace");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong");
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="size-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="border-b border-sidebar-border px-4 py-4">
            <SheetTitle>
              <Logo />
            </SheetTitle>
          </SheetHeader>
          <div className="py-3">
            <SidebarNav role={me.role} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 px-2 font-medium">
            <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="max-w-40 truncate">{me.company.name}</span>
            {me.companies.length > 1 && (
              <ChevronsUpDown className="size-3.5 text-muted-foreground" />
            )}
          </Button>
        </DropdownMenuTrigger>
        {me.companies.length > 1 && (
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {me.companies.map((company) => (
              <DropdownMenuItem
                key={company.id}
                onClick={() => handleSwitchCompany(company.id)}
                className="justify-between"
              >
                <span className="flex flex-col">
                  <span>{company.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {company.role.toLowerCase().replace("_", " ")}
                  </span>
                </span>
                {company.id === me.company.id && <Check className="size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        )}
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {initials(me.user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{me.user.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <span className="block truncate text-sm font-medium">{me.user.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{me.user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleLogout(false)}>
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLogout(true)} variant="destructive">
              <ShieldOff className="size-4" />
              Log out all devices
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

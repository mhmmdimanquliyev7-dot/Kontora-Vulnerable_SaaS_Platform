import {
  FileText,
  History,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "@/lib/api/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Omitted = visible to every authenticated role. */
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["OWNER", "ACCOUNTANT"] },
  { href: "/clients", label: "Clients", icon: Users, roles: ["OWNER", "ACCOUNTANT", "MEMBER"] },
  // Not CLIENT_GUEST: that role is redirected out of this shell entirely
  // (see AppShell) before it would ever render this nav — listed
  // explicitly anyway so intent is clear even if that redirect changes.
  { href: "/invoices", label: "Invoices", icon: FileText, roles: ["OWNER", "ACCOUNTANT", "MEMBER"] },
  { href: "/expenses", label: "Expenses", icon: Receipt, roles: ["OWNER", "ACCOUNTANT"] },
  { href: "/team", label: "Team", icon: UsersRound, roles: ["OWNER", "ACCOUNTANT"] },
  { href: "/activity", label: "Activity", icon: History, roles: ["OWNER", "ACCOUNTANT"] },
  { href: "/settings/company", label: "Settings", icon: Settings, roles: ["OWNER"] },
];

export function visibleNavItems(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}

import { Badge } from "@/components/ui/badge";
import type { Role } from "@/lib/api/types";

const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Owner",
  ACCOUNTANT: "Accountant",
  MEMBER: "Member",
  CLIENT_GUEST: "Client",
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge variant={role === "OWNER" ? "default" : "secondary"}>{ROLE_LABEL[role]}</Badge>;
}

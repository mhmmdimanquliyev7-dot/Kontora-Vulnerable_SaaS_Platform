import { apiFetch } from "@/lib/api/client";
import type { Role, TeamMember } from "@/lib/api/types";

export interface InviteMemberInput {
  email: string;
  name: string;
  role: Role;
  clientId?: string;
}

export async function listTeam(): Promise<TeamMember[]> {
  const res = await apiFetch<{ members: TeamMember[] }>("/api/team");
  return res.members;
}

export interface MemberReportRow {
  membershipId: string;
  role: Role;
  member: string;
  invoiceCount: number;
}

// Owner-only member activity report: invoices created by each team member.
export async function getMemberReport(): Promise<MemberReportRow[]> {
  const res = await apiFetch<{ report: MemberReportRow[] }>("/api/team/report");
  return res.report;
}

export function inviteMember(input: InviteMemberInput): Promise<unknown> {
  return apiFetch("/api/team/invite", { method: "POST", body: JSON.stringify(input) });
}

export function changeMemberRole(membershipId: string, role: Role): Promise<unknown> {
  return apiFetch(`/api/team/${membershipId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function removeMember(membershipId: string): Promise<void> {
  return apiFetch(`/api/team/${membershipId}`, { method: "DELETE" });
}

"use client";

import { MoreHorizontal, Trash2, UserPlus, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RoleBadge } from "@/components/shared/role-badge";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { useMe } from "@/hooks/use-auth";
import { useChangeMemberRole, useRemoveMember, useTeam } from "@/hooks/use-team";
import { ApiError } from "@/lib/api/client";
import { getMemberReport, type MemberReportRow } from "@/lib/api/team";
import { initials } from "@/lib/format";
import type { Role, TeamMember } from "@/lib/api/types";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "MEMBER", label: "Member" },
  { value: "CLIENT_GUEST", label: "Client" },
];

function MemberReportSection() {
  const [rows, setRows] = useState<MemberReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      setRows(await getMemberReport());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Report failed.");
      setRows(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Member activity report</h2>
          <p className="text-sm text-muted-foreground">Invoices created by each team member.</p>
        </div>
        <Button variant="secondary" onClick={run} disabled={loading}>
          {loading ? "Running…" : "Run report"}
        </Button>
      </div>
      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : rows !== null ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Invoices created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.membershipId}>
                  <TableCell className="font-medium">{r.member}</TableCell>
                  <TableCell>
                    <RoleBadge role={r.role} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.invoiceCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}

export default function TeamPage() {
  const { data: me } = useMe();
  const isOwner = me?.role === "OWNER";

  const team = useTeam();
  const changeRole = useChangeMemberRole();
  const removeMember = useRemoveMember();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);

  async function handleRoleChange(member: TeamMember, role: Role) {
    if (role === member.role) return;
    if (role === "CLIENT_GUEST" && !member.clientId) {
      toast.error("Invite a new CLIENT_GUEST instead — this member has no linked client.");
      return;
    }
    try {
      await changeRole.mutateAsync({ membershipId: member.membershipId, role });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong");
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    try {
      await removeMember.mutateAsync(removeTarget.membershipId);
      setRemoveTarget(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Who has access to this workspace."
        actions={
          isOwner && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="size-4" />
              Invite member
            </Button>
          )
        }
      />

      {team.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : team.data && team.data.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.data.map((member) => (
                <TableRow key={member.membershipId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-primary/10 text-xs text-primary">
                          {initials(member.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.user.email}</TableCell>
                  <TableCell>
                    {isOwner ? (
                      <Select
                        value={member.role}
                        onValueChange={(role) => handleRoleChange(member, role as Role)}
                      >
                        <SelectTrigger size="sm" className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <RoleBadge role={member.role} />
                    )}
                  </TableCell>
                  <TableCell>
                    {isOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setRemoveTarget(member)}
                          >
                            <Trash2 className="size-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState icon={UsersRound} title="No team members" />
      )}

      {isOwner && <MemberReportSection />}

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove team member?"
        description={`${removeTarget?.user.name} will immediately lose access to this workspace.`}
        confirmLabel="Remove"
        loading={removeMember.isPending}
        onConfirm={confirmRemove}
      />
    </div>
  );
}

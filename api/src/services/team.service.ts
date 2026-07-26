import { randomBytes } from "node:crypto";

import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors.js";
import { hashPassword } from "@/lib/password.js";
import { prisma } from "@/lib/prisma.js";
import { recordActivity } from "@/services/activity.service.js";
import { Role } from "@kontora/db";

export async function listTeamMembers(companyId: string) {
  const memberships = await prisma.teamMembership.findMany({
    where: { companyId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((m) => ({
    membershipId: m.id,
    role: m.role,
    clientId: m.clientId,
    user: m.user,
  }));
}

async function countOwners(companyId: string): Promise<number> {
  return prisma.teamMembership.count({ where: { companyId, role: Role.OWNER } });
}

export interface InviteMemberInput {
  email: string;
  name: string;
  role: Role;
  clientId?: string;
}

// There is no email delivery in this project yet, so an invited user who
// doesn't already have an account is created with a random, never-returned
// password — they can't log in until a password-reset flow exists. That's a
// known, intentional gap (documented in the README), not an oversight: the
// alternative (emailing/returning a real credential) is worse.
export async function inviteMember(
  companyId: string,
  actorUserId: string,
  input: InviteMemberInput,
) {
  if (input.role === Role.CLIENT_GUEST) {
    const client = await prisma.client.findFirst({ where: { id: input.clientId, companyId } });
    if (!client) {
      throw new ValidationError("clientId must belong to this company.");
    }
  }

  let user = await prisma.user.findUnique({ where: { email: input.email } });

  if (user) {
    const existingMembership = await prisma.teamMembership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId } },
    });
    if (existingMembership) {
      throw new ConflictError("This person is already a member of this company.");
    }
  } else {
    const randomPassword = randomBytes(24).toString("base64url");
    const passwordHash = await hashPassword(randomPassword);
    user = await prisma.user.create({
      data: { email: input.email, name: input.name, passwordHash },
    });
  }

  const membership = await prisma.teamMembership.create({
    data: { userId: user.id, companyId, role: input.role, clientId: input.clientId },
    include: { user: { select: { id: true, email: true, name: true, createdAt: true } } },
  });

  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "team.invited",
    entityType: "TeamMembership",
    entityId: membership.id,
    metadata: { invitedEmail: input.email, role: input.role },
  });

  return membership;
}

export async function changeRole(
  companyId: string,
  actorUserId: string,
  membershipId: string,
  newRole: Role,
) {
  const membership = await prisma.teamMembership.findFirst({
    where: { id: membershipId, companyId },
  });
  if (!membership) throw new NotFoundError("Team member not found.");

  if (newRole === Role.CLIENT_GUEST && !membership.clientId) {
    throw new ValidationError(
      "This membership has no linked client — invite a new CLIENT_GUEST instead of converting this one.",
    );
  }

  if (membership.role === Role.OWNER && newRole !== Role.OWNER) {
    const owners = await countOwners(companyId);
    if (owners <= 1) {
      throw new ConflictError("Cannot change the role of the last remaining owner.");
    }
  }

  const updated = await prisma.teamMembership.update({
    where: { id: membershipId },
    data: { role: newRole },
    include: { user: { select: { id: true, email: true, name: true, createdAt: true } } },
  });

  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "team.role_changed",
    entityType: "TeamMembership",
    entityId: membership.id,
    metadata: { from: membership.role, to: newRole, targetUserId: membership.userId },
  });

  return updated;
}

export async function removeMember(companyId: string, actorUserId: string, membershipId: string) {
  const membership = await prisma.teamMembership.findFirst({
    where: { id: membershipId, companyId },
  });
  if (!membership) throw new NotFoundError("Team member not found.");

  if (membership.role === Role.OWNER) {
    const owners = await countOwners(companyId);
    if (owners <= 1) {
      throw new ConflictError("Cannot remove the last remaining owner.");
    }
  }

  await prisma.$transaction([
    prisma.teamMembership.delete({ where: { id: membershipId } }),
    // Cut off access immediately rather than waiting for their access token
    // to naturally expire.
    prisma.session.updateMany({
      where: { userId: membership.userId, companyId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "team.removed",
    entityType: "TeamMembership",
    entityId: membershipId,
    metadata: { removedUserId: membership.userId, role: membership.role },
  });
}

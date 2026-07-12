import { prisma } from "@/lib/prisma.js";

export async function listTeamMembers(companyId: string) {
  const memberships = await prisma.teamMembership.findMany({
    where: { companyId },
    include: { user: { select: { id: true, email: true, name: true, createdAt: true } } },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((m) => ({
    membershipId: m.id,
    role: m.role,
    user: m.user,
  }));
}

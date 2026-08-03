import type { Request, Response } from "express";

import { NotFoundError } from "@/lib/errors.js";
import { prisma } from "@/lib/prisma.js";

// Cross-tenant staff view: every user on the platform, with their memberships
// and which company each belongs to. Support uses this to locate an account by
// email across all customers.
export async function listAllUsers(_req: Request, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      memberships: {
        select: {
          id: true,
          role: true,
          company: { select: { id: true, name: true } },
        },
      },
    },
  });

  res.status(200).json({ count: users.length, users });
}

// Hard-delete a user account platform-wide. Destructive; staff-only.
export async function deleteUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError("User not found.");
  }

  await prisma.$transaction([
    prisma.teamMembership.deleteMany({ where: { userId: id } }),
    prisma.session.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  res.status(200).json({ status: "deleted", userId: id, email: user.email });
}
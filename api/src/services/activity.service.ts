import { prisma } from "@/lib/prisma.js";
import type { Prisma } from "@kontora/db";

export interface RecordActivityInput {
  companyId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

// Called by services after a successful write — never by controllers
// directly — so every mutation path is guaranteed to leave an audit trail.
// Deliberately swallows its own errors: a logging failure must never roll
// back or mask the business operation that triggered it.
export async function recordActivity(input: RecordActivityInput): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        companyId: input.companyId,
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.error("Failed to record activity log entry:", err);
  }
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export async function listActivity(companyId: string, params: { limit?: number; offset?: number }) {
  const limit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const offset = params.offset ?? 0;

  const [entries, total] = await Promise.all([
    prisma.activityLog.findMany({
      where: { companyId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.activityLog.count({ where: { companyId } }),
  ]);

  return { entries, total, limit, offset };
}

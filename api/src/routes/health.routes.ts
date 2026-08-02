import { Router } from "express";
import { getHealth } from "@/controllers/health.controller.js";
import { prisma } from "@/lib/prisma.js";

export const healthRouter = Router();
healthRouter.get("/", getHealth);

// Internal diagnostics — for ops/monitoring only, not linked in the UI.
healthRouter.get("/debug/stats", async (_req, res) => {
  const [users, companies, invoices, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.company.count(),
    prisma.invoice.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { email: true, name: true, createdAt: true },
    }),
  ]);
  res.status(200).json({
    status: "ok",
    node: process.version,
    env: process.env.NODE_ENV,
    counts: { users, companies, invoices },
    recentSignups: recentUsers,
  });
});
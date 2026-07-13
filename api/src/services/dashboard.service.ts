import { prisma } from "@/lib/prisma.js";
import { InvoiceStatus } from "@kontora/db";

export async function getSummary(companyId: string) {
  const now = new Date();

  const [
    revenue,
    outstanding,
    overdueCount,
    expenseTotal,
    clientCount,
    invoiceCount,
    recentActivity,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: { companyId, status: InvoiceStatus.PAID },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { companyId, status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] } },
      _sum: { total: true },
    }),
    prisma.invoice.count({
      where: {
        companyId,
        OR: [
          { status: InvoiceStatus.OVERDUE },
          { status: InvoiceStatus.SENT, dueDate: { lt: now } },
        ],
      },
    }),
    prisma.expense.aggregate({ where: { companyId }, _sum: { amount: true } }),
    prisma.client.count({ where: { companyId } }),
    prisma.invoice.count({ where: { companyId } }),
    prisma.activityLog.findMany({
      where: { companyId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    totalRevenue: revenue._sum.total ?? 0,
    outstandingAmount: outstanding._sum.total ?? 0,
    overdueCount,
    totalExpenses: expenseTotal._sum.amount ?? 0,
    clientCount,
    invoiceCount,
    recentActivity,
  };
}

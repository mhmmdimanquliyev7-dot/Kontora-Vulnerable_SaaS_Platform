import { prisma } from "@/lib/prisma.js";

export async function listExpenses(companyId: string) {
  return prisma.expense.findMany({
    where: { companyId },
    orderBy: { date: "desc" },
  });
}

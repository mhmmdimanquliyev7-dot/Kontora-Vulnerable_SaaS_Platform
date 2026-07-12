import { prisma } from "@/lib/prisma.js";

// companyId always comes from the caller's verified access token
// (req.auth.companyId), never from a request param — this is what makes the
// query tenant-isolated. There is no other filter a caller could supply to
// see another company's clients.
export async function listClients(companyId: string) {
  return prisma.client.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}

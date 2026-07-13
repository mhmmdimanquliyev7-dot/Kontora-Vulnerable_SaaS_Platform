import { ConflictError, NotFoundError } from "@/lib/errors.js";
import { prisma } from "@/lib/prisma.js";
import { recordActivity } from "@/services/activity.service.js";

export interface ListClientsParams {
  companyId: string;
  search?: string;
}

// companyId always comes from the caller's verified access token
// (req.auth.companyId), never from a request param — this is what makes the
// query tenant-isolated. There is no other filter a caller could supply to
// see another company's clients.
export async function listClients(params: ListClientsParams) {
  return prisma.client.findMany({
    where: {
      companyId: params.companyId,
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" } },
              { email: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });
}

// Returns null (not the row) on a cross-tenant id — the caller maps that to
// a 404, never a 403, so a guessed id from another company doesn't even
// confirm the record exists.
async function findOwnedClient(companyId: string, clientId: string) {
  return prisma.client.findFirst({ where: { id: clientId, companyId } });
}

export async function getClient(companyId: string, clientId: string) {
  const client = await findOwnedClient(companyId, clientId);
  if (!client) throw new NotFoundError("Client not found.");
  return client;
}

export interface ClientInput {
  name: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  notes?: string;
}

export async function createClient(companyId: string, actorUserId: string, input: ClientInput) {
  const client = await prisma.client.create({ data: { companyId, ...input } });
  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "client.created",
    entityType: "Client",
    entityId: client.id,
    metadata: { name: client.name },
  });
  return client;
}

export async function updateClient(
  companyId: string,
  actorUserId: string,
  clientId: string,
  input: Partial<ClientInput>,
) {
  await getClient(companyId, clientId); // throws NotFoundError if not owned

  const client = await prisma.client.update({ where: { id: clientId }, data: input });
  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "client.updated",
    entityType: "Client",
    entityId: client.id,
    metadata: { fields: Object.keys(input) },
  });
  return client;
}

export async function deleteClient(companyId: string, actorUserId: string, clientId: string) {
  const client = await getClient(companyId, clientId);

  const invoiceCount = await prisma.invoice.count({ where: { clientId } });
  if (invoiceCount > 0) {
    throw new ConflictError(
      `Cannot delete a client with ${invoiceCount} existing invoice(s). Void or reassign them first.`,
    );
  }

  await prisma.client.delete({ where: { id: clientId } });
  await recordActivity({
    companyId,
    userId: actorUserId,
    action: "client.deleted",
    entityType: "Client",
    entityId: clientId,
    metadata: { name: client.name },
  });
}

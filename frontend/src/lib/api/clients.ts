import { apiFetch } from "@/lib/api/client";
import type { Client } from "@/lib/api/types";

export interface ClientInput {
  name: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  notes?: string;
}

export async function listClients(search?: string): Promise<Client[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await apiFetch<{ clients: Client[] }>(`/api/clients${qs}`);
  return res.clients;
}

export async function getClient(id: string): Promise<Client> {
  const res = await apiFetch<{ client: Client }>(`/api/clients/${id}`);
  return res.client;
}

export async function createClient(input: ClientInput): Promise<Client> {
  const res = await apiFetch<{ client: Client }>("/api/clients", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.client;
}

export async function updateClient(id: string, input: Partial<ClientInput>): Promise<Client> {
  const res = await apiFetch<{ client: Client }>(`/api/clients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.client;
}

export function deleteClient(id: string): Promise<void> {
  return apiFetch(`/api/clients/${id}`, { method: "DELETE" });
}

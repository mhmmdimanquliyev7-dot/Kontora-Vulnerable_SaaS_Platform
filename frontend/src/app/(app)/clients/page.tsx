"use client";

import { MoreHorizontal, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { HashHighlightBanner } from "@/components/clients/hash-highlight-banner";
import { ImportXmlButton } from "@/components/clients/import-xml-button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useMe } from "@/hooks/use-auth";
import { useClients, useDeleteClient } from "@/hooks/use-clients";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api/client";
import type { Client } from "@/lib/api/types";

export default function ClientsPage() {
  const { data: me } = useMe();
  const canDelete = me?.role === "OWNER" || me?.role === "ACCOUNTANT";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const clients = useClients(debouncedSearch || undefined);

  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const deleteClient = useDeleteClient();

  function openCreate() {
    setEditingClient(undefined);
    setFormOpen(true);
  }

  function openEdit(client: Client) {
    setEditingClient(client);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteClient.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="The people and companies you bill."
        actions={
          <>
            <ImportXmlButton />
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              New client
            </Button>
          </>
        }
      />

      <HashHighlightBanner />

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {clients.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : clients.data && clients.data.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Billing address</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.data.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    {client.name}
                    {client.notes && (
                      <p className="max-w-xs truncate text-xs font-normal text-muted-foreground">
                        {client.notes}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{client.phone ?? "—"}</TableCell>
                  <TableCell className="max-w-56 truncate text-muted-foreground">
                    {client.billingAddress ?? "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(client)}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        {canDelete && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(client)}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={debouncedSearch ? "No clients match your search" : "No clients yet"}
          description={
            debouncedSearch
              ? "Try a different search term."
              : "Add your first client to start invoicing."
          }
          action={
            !debouncedSearch && (
              <Button onClick={openCreate}>
                <Plus className="size-4" />
                New client
              </Button>
            )
          }
        />
      )}

      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={editingClient} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete client?"
        description={`This will permanently delete "${deleteTarget?.name}". Clients with existing invoices can't be deleted.`}
        confirmLabel="Delete"
        loading={deleteClient.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

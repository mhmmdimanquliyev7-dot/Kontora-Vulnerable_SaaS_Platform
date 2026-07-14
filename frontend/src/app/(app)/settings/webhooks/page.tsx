"use client";

import { History, Lock, Plus, Trash2, Webhook as WebhookIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { WebhookDeliveriesDialog } from "@/components/settings/webhook-deliveries-dialog";
import { WebhookFormDialog } from "@/components/settings/webhook-form-dialog";
import { WebhookSecretDialog } from "@/components/settings/webhook-secret-dialog";
import { useMe } from "@/hooks/use-auth";
import { useDeleteWebhook, useTestWebhook, useUpdateWebhook, useWebhooks } from "@/hooks/use-webhooks";
import { formatDateTime } from "@/lib/format";
import type { Webhook } from "@/lib/api/types";

function WebhookActiveToggle({ webhook }: { webhook: Webhook }) {
  const updateWebhook = useUpdateWebhook(webhook.id);
  return (
    <Switch
      checked={webhook.isActive}
      onCheckedChange={(checked) => updateWebhook.mutate({ isActive: checked })}
      disabled={updateWebhook.isPending}
    />
  );
}

export default function WebhooksSettingsPage() {
  const { data: me } = useMe();
  const isOwner = me?.role === "OWNER";

  const webhooks = useWebhooks(isOwner);
  const testWebhook = useTestWebhook();
  const deleteWebhook = useDeleteWebhook();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Webhook | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null);
  const [deliveriesFor, setDeliveriesFor] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <PageHeader title="Webhooks" description="Configure outbound event notifications." />
        <EmptyState
          icon={Lock}
          title="Owner access required"
          description="Only the workspace owner can view and manage webhooks."
        />
      </div>
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteWebhook.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        description="Kontora will POST a signed JSON payload to these URLs when the events you select happen."
        actions={
          <Button
            onClick={() => {
              setEditTarget(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" />
            New webhook
          </Button>
        }
      />

      {webhooks.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : webhooks.data && webhooks.data.length > 0 ? (
        <div className="space-y-3">
          {webhooks.data.map((webhook) => (
            <div key={webhook.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{webhook.description || webhook.url}</p>
                    {!webhook.isActive && <Badge variant="secondary">Paused</Badge>}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{webhook.url}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {webhook.events.map((event) => (
                      <Badge key={event} variant="outline">
                        {event}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Secret {webhook.secretPreview} · created {formatDateTime(webhook.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <WebhookActiveToggle webhook={webhook} />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={testWebhook.isPending}
                    onClick={() => testWebhook.mutate(webhook.id)}
                  >
                    Test
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setDeliveriesFor(webhook.id)}
                  >
                    <History className="size-4" />
                    <span className="sr-only">Recent deliveries</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(webhook)}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={WebhookIcon}
          title="No webhooks configured"
          description="Add one to get notified when invoices are created or paid."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              New webhook
            </Button>
          }
        />
      )}

      <WebhookFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        webhook={editTarget}
        onCreated={(created) => setRevealedSecret(created.secret ?? null)}
      />
      <WebhookSecretDialog
        open={!!revealedSecret}
        onOpenChange={(open) => !open && setRevealedSecret(null)}
        secret={revealedSecret}
      />
      <WebhookDeliveriesDialog webhookId={deliveriesFor} onOpenChange={(open) => !open && setDeliveriesFor(null)} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete webhook?"
        description={`Kontora will stop sending events to ${deleteTarget?.url}.`}
        confirmLabel="Delete"
        loading={deleteWebhook.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

"use client";

import { CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { useWebhookDeliveries } from "@/hooks/use-webhooks";
import { formatDateTime } from "@/lib/format";

interface WebhookDeliveriesDialogProps {
  webhookId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function WebhookDeliveriesDialog({ webhookId, onOpenChange }: WebhookDeliveriesDialogProps) {
  const deliveries = useWebhookDeliveries(webhookId ?? undefined);

  return (
    <Dialog open={!!webhookId} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Recent deliveries</DialogTitle>
          <DialogDescription>The last 20 delivery attempts for this webhook.</DialogDescription>
        </DialogHeader>

        {deliveries.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : deliveries.data && deliveries.data.length > 0 ? (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {deliveries.data.map((d) => (
              <div key={d.id} className="flex items-start gap-3 rounded-md border p-3 text-sm">
                {d.success ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-status-good" />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-status-critical" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{d.event}</span>
                    <Badge variant={d.success ? "secondary" : "destructive"}>
                      {d.statusCode ?? "no response"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(d.createdAt)} · {d.durationMs}ms
                  </p>
                  {d.errorMessage && (
                    <p className="mt-1 text-xs text-status-critical">{d.errorMessage}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={CheckCircle2} title="No deliveries yet" description="Use “Test” to send a sample event." />
        )}
      </DialogContent>
    </Dialog>
  );
}

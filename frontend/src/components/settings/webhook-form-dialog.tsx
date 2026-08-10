"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { useCreateWebhook, useUpdateWebhook, useVerifyWebhookUrl } from "@/hooks/use-webhooks";
import type { Webhook, WebhookEvent } from "@/lib/api/types";

const EVENT_OPTIONS: { value: WebhookEvent; label: string; hint: string }[] = [
  { value: "invoice.created", label: "Invoice created", hint: "Fires when a new invoice is created" },
  { value: "invoice.paid", label: "Invoice paid", hint: "Fires when an invoice's status becomes Paid" },
];

const webhookSchema = z.object({
  url: z.string().trim().url("Enter a valid URL").refine((v) => v.startsWith("https://"), {
    message: "Webhook URLs must use HTTPS",
  }),
  description: z.string().trim().max(200).optional(),
  events: z.array(z.enum(["invoice.created", "invoice.paid"])).min(1, "Select at least one event"),
});

type WebhookValues = z.infer<typeof webhookSchema>;

interface WebhookFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook?: Webhook;
  onCreated?: (webhook: Webhook) => void;
}

export function WebhookFormDialog({ open, onOpenChange, webhook, onCreated }: WebhookFormDialogProps) {
  const isEdit = !!webhook;
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook(webhook?.id ?? "");
  const verifyUrl = useVerifyWebhookUrl();
  const pending = createWebhook.isPending || updateWebhook.isPending;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<WebhookValues>({ resolver: zodResolver(webhookSchema) });

  const selectedEvents = watch("events") ?? [];
  const currentUrl = watch("url");

  useEffect(() => {
    if (open) {
      reset({
        url: webhook?.url ?? "",
        description: webhook?.description ?? "",
        events: webhook?.events ?? [],
      });
    }
  }, [open, webhook, reset]);

  function toggleEvent(event: WebhookEvent, checked: boolean) {
    const next = checked
      ? [...selectedEvents, event]
      : selectedEvents.filter((e) => e !== event);
    setValue("events", next, { shouldValidate: true });
  }

  async function onSubmit(values: WebhookValues) {
    const input = { url: values.url, description: values.description || undefined, events: values.events };
    if (isEdit) {
      const result = await updateWebhook.mutateAsync(input);
      if (result) onOpenChange(false);
    } else {
      const result = await createWebhook.mutateAsync(input);
      if (result) {
        onOpenChange(false);
        onCreated?.(result);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit webhook" : "New webhook"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update where this webhook delivers and which events it subscribes to."
                : "Kontora will POST a signed JSON payload to this URL when the events you select happen."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <FormField label="Endpoint URL" htmlFor="url" error={errors.url?.message} required>
              <div className="flex gap-2">
                <Input
                  id="url"
                  placeholder="https://example.com/webhooks/kontora"
                  {...register("url")}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={verifyUrl.isPending || !currentUrl?.trim()}
                  onClick={() => verifyUrl.mutate(currentUrl)}
                >
                  {verifyUrl.isPending && <Loader2 className="size-4 animate-spin" />}
                  Verify
                </Button>
              </div>
            </FormField>
            <FormField label="Description" htmlFor="description" error={errors.description?.message}>
              <Input id="description" placeholder="e.g. Slack notifier" {...register("description")} />
            </FormField>
            <FormField label="Events" htmlFor="events" error={errors.events?.message} required>
              <div className="space-y-2">
                {EVENT_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-start gap-2 rounded-md border p-3 text-sm has-data-checked:border-primary"
                  >
                    <Checkbox
                      checked={selectedEvents.includes(option.value)}
                      onCheckedChange={(checked) => toggleEvent(option.value, checked === true)}
                    />
                    <span>
                      <span className="block font-medium">{option.label}</span>
                      <span className="block text-xs text-muted-foreground">{option.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </FormField>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create webhook"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

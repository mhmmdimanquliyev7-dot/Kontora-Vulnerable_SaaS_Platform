"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { useCreateClient, useUpdateClient } from "@/hooks/use-clients";
import type { Client } from "@/lib/api/types";

const clientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().max(320).optional(),
  phone: z.string().trim().max(50).optional(),
  billingAddress: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
});

type ClientValues = z.infer<typeof clientSchema>;

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
}

export function ClientFormDialog({ open, onOpenChange, client }: ClientFormDialogProps) {
  const isEdit = !!client;
  const createClient = useCreateClient();
  const updateClient = useUpdateClient(client?.id ?? "");
  const pending = createClient.isPending || updateClient.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientValues>({ resolver: zodResolver(clientSchema) });

  useEffect(() => {
    if (open) {
      reset({
        name: client?.name ?? "",
        email: client?.email ?? "",
        phone: client?.phone ?? "",
        billingAddress: client?.billingAddress ?? "",
        notes: client?.notes ?? "",
      });
    }
  }, [open, client, reset]);

  async function onSubmit(values: ClientValues) {
    const input = {
      name: values.name,
      email: values.email || undefined,
      phone: values.phone || undefined,
      billingAddress: values.billingAddress || undefined,
      notes: values.notes || undefined,
    };
    const result = isEdit
      ? await updateClient.mutateAsync(input)
      : await createClient.mutateAsync(input);
    if (result) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit client" : "New client"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update this client's details." : "Add a new client to bill."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
              <Input id="name" {...register("name")} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Email" htmlFor="email" error={errors.email?.message}>
                <Input id="email" type="email" {...register("email")} />
              </FormField>
              <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
                <Input id="phone" {...register("phone")} />
              </FormField>
            </div>
            <FormField
              label="Billing address"
              htmlFor="billingAddress"
              error={errors.billingAddress?.message}
            >
              <Input id="billingAddress" {...register("billingAddress")} />
            </FormField>
            <FormField label="Notes" htmlFor="notes" error={errors.notes?.message}>
              <Textarea id="notes" rows={3} {...register("notes")} />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

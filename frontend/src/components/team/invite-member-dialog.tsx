"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import { useClients } from "@/hooks/use-clients";
import { useInviteMember } from "@/hooks/use-team";

const inviteSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    name: z.string().trim().min(1, "Name is required").max(200),
    role: z.enum(["OWNER", "ACCOUNTANT", "MEMBER", "CLIENT_GUEST"]),
    clientId: z.string().optional(),
  })
  .refine((data) => data.role !== "CLIENT_GUEST" || !!data.clientId, {
    message: "Select the client this guest represents",
    path: ["clientId"],
  });

type InviteValues = z.infer<typeof inviteSchema>;

const ROLE_OPTIONS = [
  { value: "OWNER", label: "Owner" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "MEMBER", label: "Member" },
  { value: "CLIENT_GUEST", label: "Client (portal access)" },
] as const;

export function InviteMemberDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const invite = useInviteMember();
  const clients = useClients();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", name: "", role: "MEMBER", clientId: undefined },
  });

  const role = useWatch({ control, name: "role" });

  useEffect(() => {
    if (open) reset({ email: "", name: "", role: "MEMBER", clientId: undefined });
  }, [open, reset]);

  async function onSubmit(values: InviteValues) {
    await invite.mutateAsync(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>
              They&apos;ll be added to this workspace. If they don&apos;t have an account yet,
              they&apos;ll need a password reset to sign in.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <FormField label="Email" htmlFor="invite-email" error={errors.email?.message} required>
              <Input id="invite-email" type="email" {...register("email")} />
            </FormField>
            <FormField label="Name" htmlFor="invite-name" error={errors.name?.message} required>
              <Input id="invite-name" {...register("name")} />
            </FormField>
            <FormField label="Role" htmlFor="invite-role" error={errors.role?.message} required>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="invite-role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            {role === "CLIENT_GUEST" && (
              <FormField
                label="Linked client"
                htmlFor="invite-clientId"
                error={errors.clientId?.message}
                hint="They'll only see this client's invoices."
                required
              >
                <Controller
                  control={control}
                  name="clientId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="invite-clientId" className="w-full">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.data?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending && <Loader2 className="size-4 animate-spin" />}
              Send invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

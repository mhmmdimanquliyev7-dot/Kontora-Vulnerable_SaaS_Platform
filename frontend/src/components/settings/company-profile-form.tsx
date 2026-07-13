"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { useUpdateCompany } from "@/hooks/use-company";
import type { Company } from "@/lib/api/types";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  website: z.string().trim().max(2048).optional(),
  address: z.string().trim().max(500).optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

export function CompanyProfileForm({ company, readOnly }: { company: Company; readOnly: boolean }) {
  const updateCompany = useUpdateCompany();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: company.name,
      website: company.website ?? "",
      address: company.address ?? "",
    },
  });

  useEffect(() => {
    reset({ name: company.name, website: company.website ?? "", address: company.address ?? "" });
  }, [company, reset]);

  async function onSubmit(values: ProfileValues) {
    await updateCompany.mutateAsync({
      name: values.name,
      website: values.website || undefined,
      address: values.address || undefined,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Company profile</CardTitle>
      </CardHeader>
      <CardContent>
        <fieldset disabled={readOnly} className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <FormField label="Company name" htmlFor="name" error={errors.name?.message} required>
              <Input id="name" {...register("name")} />
            </FormField>
            <FormField label="Website" htmlFor="website" error={errors.website?.message}>
              <Input id="website" placeholder="https://example.com" {...register("website")} />
            </FormField>
            <FormField label="Address" htmlFor="address" error={errors.address?.message}>
              <Input id="address" {...register("address")} />
            </FormField>
            {!readOnly && (
              <div className="flex justify-end">
                <Button type="submit" disabled={updateCompany.isPending}>
                  {updateCompany.isPending && <Loader2 className="size-4 animate-spin" />}
                  Save changes
                </Button>
              </div>
            )}
          </form>
        </fieldset>
        {readOnly && (
          <p className="mt-4 text-xs text-muted-foreground">
            Only workspace owners can edit company settings.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

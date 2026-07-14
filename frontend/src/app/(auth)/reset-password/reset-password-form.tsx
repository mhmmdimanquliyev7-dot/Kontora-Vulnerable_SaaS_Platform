"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { useResetPassword } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";

// Mirrors passwordSchema in api/src/validation/auth.schemas.ts — the API is
// the actual authority and re-validates regardless of what this rejects.
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(10, "Password must be at least 10 characters")
      .regex(/[A-Za-z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const resetPassword = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: ResetPasswordValues) {
    if (!token) return;
    try {
      await resetPassword.mutateAsync({ token, password: values.password });
      toast.success("Password reset. Please log in with your new password.");
      router.push("/login");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong");
    }
  }

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Invalid reset link</CardTitle>
          <CardDescription>
            This link is missing its token. Request a new one below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            label="New password"
            htmlFor="password"
            error={errors.password?.message}
            hint="At least 10 characters, with a letter and a number."
            required
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
          </FormField>
          <FormField
            label="Confirm new password"
            htmlFor="confirmPassword"
            error={errors.confirmPassword?.message}
            required
          >
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
          </FormField>
          <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
            {resetPassword.isPending && <Loader2 className="size-4 animate-spin" />}
            Reset password
          </Button>
        </form>
        {resetPassword.isError && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/forgot-password" className="font-medium text-primary hover:underline">
              Request a new link
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

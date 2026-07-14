"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { useForgotPassword } from "@/hooks/use-auth";

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordValues) {
    // Fire-and-forget from the UI's perspective: the API always returns the
    // same generic response whether or not the email is registered (see
    // api/src/services/passwordReset.service.ts), so there's no error case
    // here worth distinguishing — a network failure is the only one, and
    // react-query surfaces that via forgotPassword.isError below.
    await forgotPassword.mutateAsync(values.email);
  }

  if (forgotPassword.isSuccess) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="size-5 text-primary" aria-hidden="true" />
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If an account exists for that email, we&apos;ve sent a link to reset your password.
            It expires in 1 hour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Back to log in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to reset it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
          </FormField>
          <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
            {forgotPassword.isPending && <Loader2 className="size-4 animate-spin" />}
            Send reset link
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

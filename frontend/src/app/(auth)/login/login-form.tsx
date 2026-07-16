"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Building2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { KontoraIdButton } from "@/components/auth/kontora-id-button";
import { useLogin, useSelectCompany } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import { resolveLanding, sanitizeReturnPath } from "@/lib/safe-redirect";
import type { CompanyMembership } from "@/lib/api/types";

// Errors the OAuth callback can bounce back to /login?error=... Mapped to
// copy here rather than letting the API put a message in the URL — a
// user-controlled error string in the address bar is its own small XSS/phishing
// surface, so the API only ever sends a known code.
const OAUTH_ERRORS: Record<string, string> = {
  oauth_denied: "Kontora ID sign-in was cancelled.",
  oauth_email_unverified:
    "That Kontora ID account's email address isn't verified, so we can't sign you in with it.",
};

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("reason") === "expired";
  const oauthError = OAUTH_ERRORS[searchParams.get("error") ?? ""];

  // Accept any of the three spellings: `returnUrl`/`next` are what a caller
  // would hand-write, `from` is what the proxy sets when it bounces an
  // unauthenticated visitor off a protected route. All three are untrusted and
  // go through sanitizeReturnPath before they're used for anything.
  const returnUrl = sanitizeReturnPath(
    searchParams.get("returnUrl") ?? searchParams.get("next") ?? searchParams.get("from"),
  );

  const [companyChoice, setCompanyChoice] = useState<{
    loginToken: string;
    companies: CompanyMembership[];
  } | null>(null);

  const login = useLogin();
  const selectCompany = useSelectCompany();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    try {
      const result = await login.mutateAsync(values);
      if (result.status === "company_selection_required") {
        setCompanyChoice({ loginToken: result.loginToken, companies: result.companies });
        return;
      }
      // resolveLanding keeps the two invariants together: a CLIENT_GUEST only
      // ever lands in the portal, and a returnUrl is only honoured if it's a
      // safe same-origin path that suits the role.
      router.push(resolveLanding(result.role, returnUrl));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong");
    }
  }

  async function onSelectCompany(companyId: string) {
    if (!companyChoice) return;
    try {
      const result = await selectCompany.mutateAsync({
        loginToken: companyChoice.loginToken,
        companyId,
      });
      router.push(resolveLanding(result.role, returnUrl));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong");
    }
  }

  if (companyChoice) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Choose a workspace</CardTitle>
          <CardDescription>
            You belong to more than one company. Pick one to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {companyChoice.companies.map((company) => (
            <button
              key={company.id}
              type="button"
              disabled={selectCompany.isPending}
              onClick={() => onSelectCompany(company.id)}
              className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <span className="flex items-center gap-3">
                <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
                <span>
                  <span className="block font-medium">{company.name}</span>
                  <span className="block text-xs text-muted-foreground capitalize">
                    {company.role.toLowerCase().replace("_", " ")}
                  </span>
                </span>
              </span>
              {selectCompany.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
              )}
            </button>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Log in to Kontora</CardTitle>
        <CardDescription>Welcome back. Enter your details to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        {expired && (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Your session expired. Please log in again.
          </p>
        )}
        {oauthError && (
          <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {oauthError}
          </p>
        )}

        <KontoraIdButton returnUrl={returnUrl} />

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or continue with email</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
          </FormField>
          <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
          </FormField>
          <p className="-mt-2 text-right text-sm">
            <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground">
              Forgot password?
            </Link>
          </p>
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending && <Loader2 className="size-4 animate-spin" />}
            Log in
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/app/(auth)/login/login-form";

export const metadata: Metadata = { title: "Log in — Kontora" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

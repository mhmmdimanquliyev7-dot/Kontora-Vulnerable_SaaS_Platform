import type { Metadata } from "next";

import { RegisterForm } from "@/app/(auth)/register/register-form";

export const metadata: Metadata = { title: "Create your workspace — Kontora" };

export default function RegisterPage() {
  return <RegisterForm />;
}

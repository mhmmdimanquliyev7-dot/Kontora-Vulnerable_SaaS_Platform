import Link from "next/link";

import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col bg-muted/40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_10%,transparent),transparent)]"
      />
      <header className="relative flex justify-center py-8">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="relative flex flex-1 items-start justify-center px-4 pb-16 sm:pt-8">
        {children}
      </main>
    </div>
  );
}

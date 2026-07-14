import Link from "next/link";

import { Button } from "@/components/ui/button";

export function CtaBanner({
  title = "Ready to get started?",
  description = "Create your workspace in under a minute — no credit card required.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-violet-700 px-6 py-16 text-center shadow-xl sm:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,rgba(255,255,255,0.15),transparent)]"
        />
        <div className="relative flex flex-col items-center gap-4">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
          <p className="max-w-md text-white/80">{description}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="bg-white text-primary shadow-sm hover:bg-white/90" asChild>
              <Link href="/register">Start free</Link>
            </Button>
            <Button
              size="lg"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              asChild
            >
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

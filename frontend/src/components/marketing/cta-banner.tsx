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
    <section className="border-t bg-muted/20">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        <p className="max-w-md text-muted-foreground">{description}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/register">Start free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import { Heart, Lock, Sparkles } from "lucide-react";

import { CtaBanner } from "@/components/marketing/cta-banner";
import { FeatureCard } from "@/components/marketing/feature-card";

export const metadata: Metadata = { title: "About — Kontora" };

const VALUES = [
  {
    icon: Sparkles,
    title: "Clarity over clutter",
    description:
      "Every screen shows what you actually need to make a decision — nothing more. We'd rather leave a feature out than bury the ones that matter.",
  },
  {
    icon: Lock,
    title: "Your data is yours",
    description:
      "Role-based access and tenant isolation aren't an afterthought — they're enforced the same way on every single screen, for every team.",
  },
  {
    icon: Heart,
    title: "Built for how small teams work",
    description:
      "Not every business needs an enterprise finance suite. Kontora is sized for the team you actually have.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(65%_60%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_10%,transparent),transparent)]"
        />
        <div className="mx-auto w-full max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <p className="text-sm font-semibold tracking-wider text-primary uppercase">About</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            We built the invoicing tool we wished we had
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Kontora started as a simple question: why does sending an invoice and knowing where
            your business stands have to be two different tools?
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-16 text-lg/8 text-muted-foreground sm:px-6">
        <p>
          Most invoicing software falls into one of two camps: bloated finance suites built for
          enterprise accounting teams, or bare-bones templates that leave you exporting
          spreadsheets by hand. Neither felt right for a small team trying to get paid on time and
          keep a clear picture of the business.
        </p>
        <p>
          So we built Kontora as one workspace: invoices, clients, and expenses together, with a
          dashboard that actually answers &ldquo;how are we doing?&rdquo; without a detour through a
          spreadsheet. Every team member sees exactly what their role needs — an owner gets the
          full picture, an accountant gets the financials, and a client gets a simple, self-serve
          view of their own invoices.
        </p>
        <p>
          We&apos;re a small, remote-first team, and we build Kontora the same way we&apos;d want to use
          it — deliberately, without unnecessary complexity, and with real care for the teams
          who depend on it to get paid.
        </p>
      </section>

      <section className="border-t bg-muted/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            What we believe
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {VALUES.map((value) => (
              <FeatureCard key={value.title} {...value} />
            ))}
          </div>
        </div>
      </section>

      <CtaBanner
        title="Want to see it for yourself?"
        description="Create a free workspace and explore Kontora with your own data."
      />
    </>
  );
}

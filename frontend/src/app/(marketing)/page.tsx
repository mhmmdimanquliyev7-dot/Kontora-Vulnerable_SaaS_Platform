import {
  Bot,
  FileText,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  UsersRound,
  Webhook,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { FeatureCard } from "@/components/marketing/feature-card";

const VALUE_PROPS = [
  {
    title: "Get paid faster",
    description: "Send professional invoices in seconds and track exactly who owes you what.",
  },
  {
    title: "See your numbers clearly",
    description: "Revenue, outstanding balances, and overdue invoices — always up to date.",
  },
  {
    title: "Built for teams",
    description: "Owners, accountants, and team members each get exactly the access they need.",
  },
];

const FEATURES = [
  {
    icon: FileText,
    title: "Invoicing",
    description: "Create, send, and track invoices with line items, taxes, and PDF export.",
  },
  {
    icon: UsersRound,
    title: "Client management",
    description: "Keep every client's contact details and invoice history in one place.",
  },
  {
    icon: Receipt,
    title: "Expense tracking",
    description: "Log and categorize expenses so you always know your real margin.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard & reports",
    description: "Revenue, outstanding balances, and overdue invoices at a glance.",
  },
  {
    icon: Webhook,
    title: "Webhooks",
    description: "Notify your own tools the moment an invoice is created or paid.",
  },
  {
    icon: Bot,
    title: "AI assistant",
    description: "Ask plain questions like \"which clients owe me money?\" and get real answers.",
  },
];

export default function MarketingHomePage() {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          Built for small businesses and freelancers
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Invoicing and client management, without the busywork
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Kontora helps small teams send invoices, track expenses, and know exactly where their
          business stands — all in one clean workspace.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/register">Start free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/features">See features</Link>
          </Button>
        </div>
      </section>

      <section className="border-y bg-muted/20">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-3">
          {VALUE_PROPS.map((prop) => (
            <div key={prop.title}>
              <h3 className="font-semibold">{prop.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{prop.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="mt-3 text-muted-foreground">
            Kontora covers the everyday work of running a service business.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button variant="link" asChild>
            <Link href="/features">See all features →</Link>
          </Button>
        </div>
      </section>

      <CtaBanner />
    </>
  );
}

import {
  ArrowRight,
  BarChart3,
  Bot,
  FileText,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  UsersRound,
  Wallet,
  Webhook,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { FeatureCard } from "@/components/marketing/feature-card";

const VALUE_PROPS = [
  {
    icon: Wallet,
    title: "Get paid faster",
    description: "Send professional invoices in seconds and track exactly who owes you what.",
  },
  {
    icon: BarChart3,
    title: "See your numbers clearly",
    description: "Revenue, outstanding balances, and overdue invoices — always up to date.",
  },
  {
    icon: ShieldCheck,
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

const PREVIEW_STATS = [
  { label: "Total revenue", value: "$48,250" },
  { label: "Outstanding", value: "$7,900" },
  { label: "Overdue", value: "2" },
];

const PREVIEW_BARS = [42, 58, 45, 70, 62, 84, 76, 95];

const PREVIEW_ROWS = [
  { client: "Acme Studio", amount: "$2,400", status: "Paid", tone: "text-status-good" },
  { client: "Northwind Co.", amount: "$1,850", status: "Sent", tone: "text-primary" },
  { client: "Bluebird Ltd.", amount: "$3,650", status: "Overdue", tone: "text-status-critical" },
];

function ProductPreview() {
  return (
    <div aria-hidden="true" className="relative mx-auto mt-16 w-full max-w-4xl select-none">
      <div className="absolute -inset-x-8 -top-10 -bottom-6 rounded-[2.5rem] bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-center gap-1.5 border-b bg-muted/40 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="ml-3 hidden rounded-md bg-background px-3 py-0.5 text-[10px] text-muted-foreground sm:inline">
            app.kontora.com/dashboard
          </span>
        </div>
        <div className="flex">
          <div className="hidden w-40 shrink-0 flex-col gap-1 border-r bg-sidebar p-3 text-left sm:flex">
            {["Dashboard", "Invoices", "Clients", "Expenses", "Assistant"].map((item, i) => (
              <span
                key={item}
                className={
                  i === 0
                    ? "rounded-md bg-sidebar-accent px-2.5 py-1.5 text-[11px] font-medium text-sidebar-accent-foreground"
                    : "rounded-md px-2.5 py-1.5 text-[11px] text-sidebar-foreground/60"
                }
              >
                {item}
              </span>
            ))}
          </div>
          <div className="flex-1 space-y-4 p-4 text-left sm:p-6">
            <div className="grid grid-cols-3 gap-3">
              {PREVIEW_STATS.map((stat) => (
                <div key={stat.label} className="rounded-lg border bg-background p-3">
                  <p className="text-[10px] text-muted-foreground sm:text-xs">{stat.label}</p>
                  <p className="mt-0.5 font-heading text-sm font-semibold tracking-tight sm:text-lg">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border bg-background p-3 sm:p-4">
              <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">
                Revenue, last 8 months
              </p>
              <div className="mt-3 flex h-20 items-end gap-1.5 sm:h-28 sm:gap-2">
                {PREVIEW_BARS.map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-primary/80 last:bg-primary"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border bg-background">
              {PREVIEW_ROWS.map((row) => (
                <div
                  key={row.client}
                  className="flex items-center justify-between border-b px-3 py-2 text-[11px] last:border-0 sm:text-xs"
                >
                  <span className="font-medium">{row.client}</span>
                  <span className="text-muted-foreground">{row.amount}</span>
                  <span className={`font-medium ${row.tone}`}>{row.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketingHomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(65%_55%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_12%,transparent),transparent)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-border)_60%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-border)_60%,transparent)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]"
        />
        <div className="mx-auto w-full max-w-6xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="size-3.5" />
            Built for small businesses and freelancers
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Invoicing and client management,{" "}
            <span className="bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent dark:to-violet-400">
              without the busywork
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Kontora helps small teams send invoices, track expenses, and know exactly where their
            business stands — all in one clean workspace.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="shadow-md shadow-primary/25" asChild>
              <Link href="/register">
                Start free
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/features">See features</Link>
            </Button>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className="border-y bg-muted/40">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3">
          {VALUE_PROPS.map((prop) => (
            <div key={prop.title} className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <prop.icon className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-heading font-semibold">{prop.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {prop.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="mt-3 text-muted-foreground">
            Kontora covers the everyday work of running a service business.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button variant="link" asChild>
            <Link href="/features">
              See all features
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </section>

      <CtaBanner />
    </>
  );
}

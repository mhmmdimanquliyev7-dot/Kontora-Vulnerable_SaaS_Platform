import type { Metadata } from "next";
import {
  Bot,
  FileText,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  UserSquare2,
  UsersRound,
  Webhook,
} from "lucide-react";

import { CtaBanner } from "@/components/marketing/cta-banner";

export const metadata: Metadata = { title: "Features — Kontora" };

const SECTIONS = [
  {
    icon: FileText,
    title: "Invoicing",
    description:
      "Create professional invoices with line items, tax, and due dates. Every total is calculated automatically, so the numbers on the page always match the numbers in your books.",
    points: [
      "Draft, send, and track invoice status end to end",
      "Line-item detail with automatic tax and totals",
      "One-click PDF export, plus bulk XML/PDF export for your accountant",
    ],
  },
  {
    icon: UsersRound,
    title: "Client management",
    description:
      "Every client lives in one roster, with their contact details and full invoice history a click away.",
    points: [
      "Searchable client directory",
      "Full invoice history per client",
      "Import your existing client list from a CSV",
    ],
  },
  {
    icon: Receipt,
    title: "Expense tracking",
    description: "Log what you spend and where, so your dashboard reflects your real margin, not just revenue.",
    points: ["Category-based tracking", "CSV import for bulk entry", "Rolled up into your reporting automatically"],
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard & reporting",
    description:
      "A live view of revenue, outstanding balances, and overdue invoices — plus a dedicated reporting tool for deeper historical breakdowns.",
    points: ["Real-time revenue and outstanding totals", "Overdue-invoice tracking", "Monthly trends and top-client breakdowns"],
  },
  {
    icon: ShieldCheck,
    title: "Team roles & permissions",
    description:
      "Give people exactly the access they need — an owner, an accountant, and a team member see different things by design, not by convention.",
    points: [
      "Owner, Accountant, and Member roles",
      "Every permission enforced consistently across the app",
      "Full activity log of who changed what",
    ],
  },
  {
    icon: UserSquare2,
    title: "Client portal",
    description:
      "Give your own clients a simple, self-serve view of their invoices — without giving them access to anything else.",
    points: ["Clients see only their own invoices", "Self-service \"Pay now\" on outstanding invoices", "No separate account setup on your end"],
  },
  {
    icon: Webhook,
    title: "Webhooks & integrations",
    description:
      "Connect Kontora to the rest of your stack. We'll call your own endpoint the moment an invoice is created or paid.",
    points: ["Signed payloads you can verify", "Subscribe per event type", "A built-in test button before you go live"],
  },
  {
    icon: Bot,
    title: "AI assistant",
    description:
      "Ask questions in plain language — \"how much is outstanding?\", \"which clients owe me money?\" — and get answers pulled from your own data.",
    points: ["Answers use your real, live numbers", "Scoped to what your role can already see", "No setup required"],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Everything you need to run your invoicing
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          One workspace for invoices, clients, expenses, and the reporting to make sense of it
          all.
        </p>
      </section>

      <section className="mx-auto w-full max-w-6xl space-y-16 px-4 pb-20 sm:px-6">
        {SECTIONS.map((section, index) => (
          <div
            key={section.title}
            className={`flex flex-col gap-8 md:flex-row md:items-start ${
              index % 2 === 1 ? "md:flex-row-reverse" : ""
            }`}
          >
            <div className="md:w-1/2">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                <section.icon className="size-6 text-primary" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">{section.title}</h2>
              <p className="mt-3 text-muted-foreground">{section.description}</p>
            </div>
            <div className="md:w-1/2">
              <ul className="space-y-3 rounded-xl border bg-card p-6">
                {section.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </section>

      <CtaBanner />
    </>
  );
}

import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pricing — Kontora" };

interface Tier {
  name: string;
  price: string;
  cadence?: string;
  description: string;
  cta: string;
  highlighted?: boolean;
  features: string[];
}

const TIERS: Tier[] = [
  {
    name: "Starter",
    price: "$0",
    cadence: "/month",
    description: "For freelancers just getting started.",
    cta: "Start free",
    features: [
      "Up to 10 invoices a month",
      "1 team member",
      "Client & expense tracking",
      "Dashboard overview",
      "Email support",
    ],
  },
  {
    name: "Team",
    price: "$29",
    cadence: "/month",
    description: "For small teams who need more hands on deck.",
    cta: "Start free trial",
    highlighted: true,
    features: [
      "Unlimited invoices",
      "Up to 5 team members",
      "Client portal",
      "Webhooks & integrations",
      "Reporting & revenue trends",
      "Priority email support",
    ],
  },
  {
    name: "Business",
    price: "$79",
    cadence: "/month",
    description: "For growing businesses that need it all.",
    cta: "Start free trial",
    features: [
      "Everything in Team",
      "Unlimited team members",
      "AI assistant",
      "Full activity audit log",
      "Dedicated support",
    ],
  },
];

interface ComparisonRow {
  label: string;
  values: [string | boolean, string | boolean, string | boolean];
}

const COMPARISON_ROWS: ComparisonRow[] = [
  { label: "Invoices per month", values: ["10", "Unlimited", "Unlimited"] },
  { label: "Team members", values: ["1", "5", "Unlimited"] },
  { label: "Client management", values: [true, true, true] },
  { label: "Expense tracking", values: [true, true, true] },
  { label: "Client portal", values: [false, true, true] },
  { label: "Webhooks & integrations", values: [false, true, true] },
  { label: "Reporting & trends", values: [false, true, true] },
  { label: "AI assistant", values: [false, false, true] },
  { label: "Activity audit log", values: [false, false, true] },
  { label: "Support", values: ["Email", "Priority email", "Dedicated"] },
];

const FAQS = [
  {
    question: "Can I change plans later?",
    answer: "Yes — upgrade or downgrade at any time from your account settings. Changes apply immediately.",
  },
  {
    question: "Is there a free trial on paid plans?",
    answer: "Team and Business both start with a free trial, no credit card required to begin.",
  },
  {
    question: "What happens if I go over my invoice limit on Starter?",
    answer: "We'll let you know — you can keep working and upgrade whenever it makes sense for you.",
  },
  {
    question: "Do clients need their own paid account?",
    answer: "No. Client portal access is included in your plan — your clients never pay anything.",
  },
];

function ComparisonCell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="mx-auto size-4 text-status-good" />
    ) : (
      <Minus className="mx-auto size-4 text-muted-foreground/50" />
    );
  }
  return <span>{value}</span>;
}

export default function PricingPage() {
  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Simple pricing that grows with you
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Start free. Upgrade when your team does.
        </p>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <Card
              key={tier.name}
              className={cn("relative flex flex-col", tier.highlighted && "border-primary shadow-md")}
            >
              {tier.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most popular</Badge>
              )}
              <CardHeader>
                <h2 className="font-semibold">{tier.name}</h2>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight">{tier.price}</span>
                  {tier.cadence && <span className="text-sm text-muted-foreground">{tier.cadence}</span>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="flex-1 space-y-2.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-status-good" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full" variant={tier.highlighted ? "default" : "outline"} asChild>
                  <Link href="/register">{tier.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight">Compare plans</h2>
        <div className="mt-8 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="p-4 text-left font-medium">Feature</th>
                {TIERS.map((tier) => (
                  <th key={tier.name} className="p-4 text-center font-medium">
                    {tier.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <td className="p-4 text-muted-foreground">{row.label}</td>
                  {row.values.map((value, i) => (
                    <td key={i} className="p-4 text-center">
                      <ComparisonCell value={value} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 pb-20 sm:px-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight">
          Frequently asked questions
        </h2>
        <div className="mt-8 space-y-6">
          {FAQS.map((faq) => (
            <div key={faq.question}>
              <h3 className="font-medium">{faq.question}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <CtaBanner />
    </>
  );
}

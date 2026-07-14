import * as expenseService from "@/services/expense.service.js";
import * as invoiceService from "@/services/invoice.service.js";
import type { InvoiceViewer } from "@/services/invoice.service.js";
import { InvoiceStatus, Role } from "@kontora/db";

// See assistantPrompt.ts for the full instruction context. This mock
// doesn't call an LLM — it's a small rule-based matcher — but every rule
// the prompt states (tenant scoping, role-gated topics, "say so honestly
// rather than guessing") is actually enforced below, in code, not just
// asserted in the prompt text.

function money(amount: number | string, currency = "USD"): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

function pick(options: string[]): string {
  return options[Math.floor(Math.random() * options.length)]!;
}

const EXPENSES_OFF_LIMITS_REPLY =
  "Expense data is only visible to owners and accountants on your team, so I can't share that with your current role. I can still help with invoices and clients, though.";

interface Intent {
  name: string;
  test: (message: string) => boolean;
  respond: (viewer: InvoiceViewer) => Promise<string>;
}

async function invoicesFor(viewer: InvoiceViewer) {
  return invoiceService.listInvoices(viewer);
}

const INTENTS: Intent[] = [
  {
    name: "greeting",
    test: (m) => /^(hi|hello|hey|yo|good (morning|afternoon|evening))\b/.test(m),
    respond: async () =>
      pick([
        "Hi! I can answer questions about your invoices, clients, and (if you're an owner or accountant) expenses — try asking something like \"how much is outstanding?\"",
        "Hello! Ask me things like \"which clients owe me money?\" or \"any overdue invoices?\" and I'll pull the real numbers for you.",
      ]),
  },
  {
    name: "capabilities",
    test: (m) => /what can you (do|help)|\bhelp\b/.test(m),
    respond: async () =>
      "I can tell you about outstanding balances, overdue invoices, total revenue, invoice/client counts, and — for owners and accountants — expenses. I only ever look at your own company's data.",
  },
  {
    name: "thanks",
    test: (m) => /\b(thanks|thank you|thx)\b/.test(m),
    respond: async () => pick(["You're welcome!", "Happy to help!", "Anytime!"]),
  },
  {
    name: "clients-who-owe",
    test: (m) => /(which|what) client|who owes|owes me/.test(m),
    respond: async (viewer) => {
      const invoices = await invoicesFor(viewer);
      const outstanding = invoices.filter(
        (i) => i.status === InvoiceStatus.SENT || i.status === InvoiceStatus.OVERDUE,
      );
      if (outstanding.length === 0) {
        return "No one currently owes you anything — every invoice is either paid, still a draft, or void. Nice.";
      }

      const byClient = new Map<string, { name: string; total: number; count: number }>();
      for (const invoice of outstanding) {
        const key = invoice.clientId;
        const entry = byClient.get(key) ?? { name: invoice.client.name, total: 0, count: 0 };
        entry.total += Number(invoice.total);
        entry.count += 1;
        byClient.set(key, entry);
      }
      const ranked = [...byClient.values()].sort((a, b) => b.total - a.total);
      const lines = ranked
        .slice(0, 5)
        .map((c) => `${c.name} — ${money(c.total)} (${c.count} invoice${c.count === 1 ? "" : "s"})`);
      const more = ranked.length > 5 ? `, and ${ranked.length - 5} more` : "";

      return `${ranked.length} client${ranked.length === 1 ? "" : "s"} currently owe${ranked.length === 1 ? "s" : ""} you money:\n${lines.join("\n")}${more}`;
    },
  },
  {
    name: "overdue",
    test: (m) => /overdue|late\b/.test(m),
    respond: async (viewer) => {
      const invoices = await invoicesFor(viewer);
      const overdue = invoices.filter((i) => i.status === InvoiceStatus.OVERDUE);
      if (overdue.length === 0) {
        return "You have no overdue invoices right now.";
      }
      const total = overdue.reduce((sum, i) => sum + Number(i.total), 0);
      const lines = overdue
        .slice(0, 5)
        .map((i) => `${i.number} — ${i.client.name}, ${money(Number(i.total), i.currency)}`);
      const more = overdue.length > 5 ? `, and ${overdue.length - 5} more` : "";
      return `You have ${overdue.length} overdue invoice${overdue.length === 1 ? "" : "s"} totaling ${money(total)}:\n${lines.join("\n")}${more}`;
    },
  },
  {
    name: "outstanding",
    test: (m) => /outstanding|unpaid|receivable|owed to (you|me)/.test(m),
    respond: async (viewer) => {
      const invoices = await invoicesFor(viewer);
      const outstanding = invoices.filter(
        (i) => i.status === InvoiceStatus.SENT || i.status === InvoiceStatus.OVERDUE,
      );
      const total = outstanding.reduce((sum, i) => sum + Number(i.total), 0);
      if (outstanding.length === 0) {
        return "Nothing outstanding right now — every invoice is paid, draft, or void.";
      }
      return pick([
        `You have ${money(total)} outstanding across ${outstanding.length} invoice${outstanding.length === 1 ? "" : "s"}.`,
        `Outstanding balance right now: ${money(total)} (${outstanding.length} unpaid invoice${outstanding.length === 1 ? "" : "s"}).`,
      ]);
    },
  },
  {
    name: "revenue",
    test: (m) => /revenue|how much (have i|has \w+ )?(made|earned)|total (paid|revenue)|income/.test(m),
    respond: async (viewer) => {
      const invoices = await invoicesFor(viewer);
      const paid = invoices.filter((i) => i.status === InvoiceStatus.PAID);
      const total = paid.reduce((sum, i) => sum + Number(i.total), 0);
      return `You've collected ${money(total)} in paid invoices so far, across ${paid.length} invoice${paid.length === 1 ? "" : "s"}.`;
    },
  },
  {
    name: "expenses",
    test: (m) => /expense/.test(m),
    respond: async (viewer) => {
      if (viewer.role !== Role.OWNER && viewer.role !== Role.ACCOUNTANT) {
        return EXPENSES_OFF_LIMITS_REPLY;
      }
      const expenses = await expenseService.listExpenses({ companyId: viewer.companyId });
      if (expenses.length === 0) {
        return "No expenses logged yet.";
      }
      const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const byCategory = new Map<string, number>();
      for (const e of expenses) {
        byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount));
      }
      const ranked = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
      const lines = ranked.slice(0, 5).map(([category, amount]) => `${category} — ${money(amount)}`);
      return `You've logged ${money(total)} in expenses across ${expenses.length} entries. Top categories:\n${lines.join("\n")}`;
    },
  },
  {
    name: "client-count",
    test: (m) => /how many clients/.test(m),
    respond: async (viewer) => {
      const invoices = await invoicesFor(viewer);
      const uniqueClients = new Set(invoices.map((i) => i.clientId)).size;
      return `You have invoices on file for ${uniqueClients} distinct client${uniqueClients === 1 ? "" : "s"}. (Ask on the Clients page for your full roster, including clients without invoices yet.)`;
    },
  },
  {
    name: "invoice-count",
    test: (m) => /how many invoices/.test(m),
    respond: async (viewer) => {
      const invoices = await invoicesFor(viewer);
      const byStatus = new Map<string, number>();
      for (const i of invoices) byStatus.set(i.status, (byStatus.get(i.status) ?? 0) + 1);
      const breakdown = [...byStatus.entries()].map(([status, count]) => `${count} ${status.toLowerCase()}`);
      return `You have ${invoices.length} invoice${invoices.length === 1 ? "" : "s"} total (${breakdown.join(", ")}).`;
    },
  },
];

const FALLBACK_REPLIES = [
  "I'm not sure how to help with that yet — I can answer questions about outstanding balances, overdue invoices, revenue, invoice/client counts, and expenses (for owners and accountants).",
  "I don't have a good answer for that one. Try asking about outstanding balances, overdue invoices, total revenue, or expenses.",
];

export async function answerQuestion(viewer: InvoiceViewer, message: string): Promise<string> {
  const normalized = message.trim().toLowerCase();
  if (!normalized) {
    return "Ask me something about your invoices, clients, or expenses!";
  }

  const intent = INTENTS.find((i) => i.test(normalized));
  if (!intent) {
    return pick(FALLBACK_REPLIES);
  }
  return intent.respond(viewer);
}

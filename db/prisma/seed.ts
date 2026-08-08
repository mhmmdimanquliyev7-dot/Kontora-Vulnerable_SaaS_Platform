import "dotenv/config";
import bcrypt from "bcryptjs";

// Explicit .ts extension: this script runs directly via Node's native
// TypeScript support (see prisma.config.ts), not through tsc, so it must
// resolve the generated client's .ts source rather than a prebuilt .js file.
import { PrismaClient, Role, InvoiceStatus, BlogPostStatus } from "../src/generated/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ===========================================================================
// ANSWER KEY — seed login credentials (DEV / TRAINING ONLY)
// ===========================================================================
// Each seed user now has a DISTINCT, deliberately weak password. Every one is
// a plain entry in the standard rockyou.txt wordlist, so a leaked bcrypt hash
// (e.g. via the SQLi sinks) cracks offline with hashcat/rockyou -> plaintext
// -> account takeover. The HASH is not weakened: bcrypt at cost 12 (below),
// same as before. Only the plaintext is common.
//
//   Acme Consulting
//     owner@acme.test        OWNER         iloveyou     <- likely YOUR login
//     accountant@acme.test   ACCOUNTANT    password1
//     member@acme.test       MEMBER        sunshine
//     member2@acme.test      MEMBER        princess
//     client@acme.test       CLIENT_GUEST  letmein
//   Nimbus Retail
//     owner@nimbus.test      OWNER         superman     <- likely YOUR login
//     accountant@nimbus.test ACCOUNTANT    trustno1
//     member@nimbus.test     MEMBER        monkey
//     client@nimbus.test     CLIENT_GUEST  football
//
// The two OWNER accounts are the ones you'd normally sign in as — don't lock
// yourself out. Keep this block in sync with scripts/update-seed-passwords.mjs.
// ===========================================================================
const SEED_PASSWORDS: Record<string, string> = {
  "owner@acme.test": "iloveyou",
  "accountant@acme.test": "password1",
  "member@acme.test": "sunshine",
  "member2@acme.test": "princess",
  "client@acme.test": "letmein",
  "owner@nimbus.test": "superman",
  "accountant@nimbus.test": "trustno1",
  "member@nimbus.test": "monkey",
  "client@nimbus.test": "football",
};

function passwordFor(email: string): string {
  const password = SEED_PASSWORDS[email];
  if (!password) {
    throw new Error(`No seed password defined for ${email} — update SEED_PASSWORDS.`);
  }
  return password;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** A date N days before the moment the seed runs — keeps output deterministic
 * relative to run time (same approach the script has always used). */
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY_MS);
}

interface SeedUserSpec {
  email: string;
  name: string;
  role: Role;
  /** Only used for CLIENT_GUEST members: name of the Client they represent. */
  guestOfClient?: string;
}

interface SeedClientSpec {
  name: string;
  email: string;
  phone: string;
  billingAddress: string;
}

interface SeedLineItemSpec {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface SeedInvoiceSpec {
  clientName: string;
  status: InvoiceStatus;
  /** Issue date = this many days before the seed run; due date is +30 days. */
  issueDaysAgo: number;
  items: SeedLineItemSpec[];
}

interface SeedExpenseSpec {
  category: string;
  description: string;
  amount: number;
  daysAgo: number;
}

interface SeedBlogPostSpec {
  title: string;
  /** Globally unique across all companies (BlogPost.slug is @unique). */
  slug: string;
  excerpt: string;
  /** Plain markdown — rendered to sanitized HTML by the app. */
  body: string;
  status: BlogPostStatus;
  /** Must be the email of a real user in the same company. */
  authorEmail: string;
  /** Set for PUBLISHED posts; omitted for drafts. */
  publishedDaysAgo?: number;
}

interface SeedCompanySpec {
  name: string;
  slug: string;
  users: SeedUserSpec[];
  clients: SeedClientSpec[];
  invoices: SeedInvoiceSpec[];
  expenses: SeedExpenseSpec[];
  blogPosts: SeedBlogPostSpec[];
}

const companies: SeedCompanySpec[] = [
  {
    name: "Acme Consulting",
    slug: "acme-consulting",
    users: [
      { email: "owner@acme.test", name: "Ava Owner", role: Role.OWNER },
      { email: "accountant@acme.test", name: "Chris Accountant", role: Role.ACCOUNTANT },
      { email: "member@acme.test", name: "Sam Member", role: Role.MEMBER },
      { email: "member2@acme.test", name: "Priya Member", role: Role.MEMBER },
      {
        email: "client@acme.test",
        name: "Blake Guest",
        role: Role.CLIENT_GUEST,
        guestOfClient: "Bluepeak Studios",
      },
    ],
    clients: [
      {
        name: "Bluepeak Studios",
        email: "billing@bluepeakstudios.test",
        phone: "+1-555-0101",
        billingAddress: "12 Bluepeak Ave, Austin, TX",
      },
      {
        name: "Redline Motors",
        email: "ap@redlinemotors.test",
        phone: "+1-555-0102",
        billingAddress: "88 Redline Blvd, Detroit, MI",
      },
      {
        name: "Harborlight Media",
        email: "accounts@harborlightmedia.test",
        phone: "+1-555-0103",
        billingAddress: "4 Harbor St, Portland, ME",
      },
      {
        name: "Summit Financial Group",
        email: "billing@summitfg.test",
        phone: "+1-555-0104",
        billingAddress: "500 Summit Tower, Chicago, IL",
      },
      {
        name: "Foxtrot Logistics",
        email: "ops@foxtrotlogistics.test",
        phone: "+1-555-0105",
        billingAddress: "22 Cargo Way, Memphis, TN",
      },
      {
        name: "Greenfield Analytics",
        email: "accounts@greenfieldanalytics.test",
        phone: "+1-555-0106",
        billingAddress: "9 Data Dr, San Jose, CA",
      },
    ],
    invoices: [
      // Bluepeak Studios (the CLIENT_GUEST's client) intentionally appears
      // several times, across statuses, so the portal has meaningful data.
      {
        clientName: "Bluepeak Studios",
        status: InvoiceStatus.PAID,
        issueDaysAgo: 178,
        items: [
          { description: "Brand strategy workshop", quantity: 2, unitPrice: 1500 },
          { description: "Website UX audit", quantity: 1, unitPrice: 1800 },
        ],
      },
      {
        clientName: "Redline Motors",
        status: InvoiceStatus.PAID,
        issueDaysAgo: 171,
        items: [
          { description: "Dealer portal implementation — sprint 1", quantity: 1, unitPrice: 7500 },
        ],
      },
      {
        clientName: "Harborlight Media",
        status: InvoiceStatus.OVERDUE,
        issueDaysAgo: 165,
        items: [
          { description: "Content platform migration", quantity: 1, unitPrice: 4200 },
          { description: "Editorial training (half-day)", quantity: 1, unitPrice: 900 },
        ],
      },
      {
        clientName: "Summit Financial Group",
        status: InvoiceStatus.PAID,
        issueDaysAgo: 158,
        items: [
          { description: "Compliance process review", quantity: 1, unitPrice: 3600 },
          { description: "Advisory retainer", quantity: 20, unitPrice: 175 },
        ],
      },
      {
        clientName: "Bluepeak Studios",
        status: InvoiceStatus.SENT,
        issueDaysAgo: 150,
        items: [{ description: "Monthly consulting retainer", quantity: 1, unitPrice: 3200 }],
      },
      {
        clientName: "Foxtrot Logistics",
        status: InvoiceStatus.PAID,
        issueDaysAgo: 142,
        items: [
          { description: "Route optimization analysis", quantity: 1, unitPrice: 5400 },
          { description: "Data integration setup", quantity: 1, unitPrice: 1200 },
        ],
      },
      {
        clientName: "Greenfield Analytics",
        status: InvoiceStatus.VOID,
        issueDaysAgo: 134,
        items: [{ description: "Dashboard prototype", quantity: 1, unitPrice: 2800 }],
      },
      {
        clientName: "Redline Motors",
        status: InvoiceStatus.SENT,
        issueDaysAgo: 126,
        items: [
          { description: "CRM integration development", quantity: 30, unitPrice: 150 },
          { description: "Platform setup fee", quantity: 1, unitPrice: 500 },
        ],
      },
      {
        clientName: "Bluepeak Studios",
        status: InvoiceStatus.OVERDUE,
        issueDaysAgo: 118,
        items: [
          { description: "Campaign analytics setup", quantity: 1, unitPrice: 2600 },
          { description: "Support & maintenance (monthly)", quantity: 1, unitPrice: 750 },
        ],
      },
      {
        clientName: "Harborlight Media",
        status: InvoiceStatus.PAID,
        issueDaysAgo: 105,
        items: [{ description: "Podcast distribution setup", quantity: 1, unitPrice: 1900 }],
      },
      {
        clientName: "Summit Financial Group",
        status: InvoiceStatus.SENT,
        issueDaysAgo: 92,
        items: [{ description: "Quarterly advisory retainer", quantity: 1, unitPrice: 5250 }],
      },
      {
        clientName: "Foxtrot Logistics",
        status: InvoiceStatus.DRAFT,
        issueDaysAgo: 80,
        items: [
          { description: "Warehouse workflow assessment", quantity: 1, unitPrice: 3100 },
          { description: "Onsite staff training", quantity: 2, unitPrice: 650 },
        ],
      },
      {
        clientName: "Greenfield Analytics",
        status: InvoiceStatus.PAID,
        issueDaysAgo: 66,
        items: [{ description: "Predictive model development", quantity: 1, unitPrice: 8800 }],
      },
      {
        clientName: "Bluepeak Studios",
        status: InvoiceStatus.VOID,
        issueDaysAgo: 54,
        items: [{ description: "Rush design revision", quantity: 1, unitPrice: 1400 }],
      },
      {
        clientName: "Redline Motors",
        status: InvoiceStatus.OVERDUE,
        issueDaysAgo: 41,
        items: [{ description: "Annual support contract", quantity: 1, unitPrice: 6000 }],
      },
      {
        clientName: "Summit Financial Group",
        status: InvoiceStatus.VOID,
        issueDaysAgo: 25,
        items: [{ description: "Duplicate engagement fee", quantity: 1, unitPrice: 3000 }],
      },
      {
        clientName: "Greenfield Analytics",
        status: InvoiceStatus.DRAFT,
        issueDaysAgo: 12,
        items: [{ description: "Data warehouse consultation", quantity: 8, unitPrice: 225 }],
      },
      {
        clientName: "Foxtrot Logistics",
        status: InvoiceStatus.SENT,
        issueDaysAgo: 7,
        items: [{ description: "Logistics dashboard — phase 2", quantity: 1, unitPrice: 4700 }],
      },
    ],
    expenses: [
      { category: "Software", description: "Figma team subscription", amount: 144, daysAgo: 8 },
      { category: "Travel", description: "Client site visit — Detroit", amount: 612.4, daysAgo: 20 },
      {
        category: "Office Supplies",
        description: "Standing desk + monitor",
        amount: 845,
        daysAgo: 33,
      },
      {
        category: "Marketing",
        description: "LinkedIn Ads — Q3 campaign",
        amount: 1250,
        daysAgo: 47,
      },
      {
        category: "Contractors",
        description: "Freelance designer — brand refresh",
        amount: 2200,
        daysAgo: 55,
      },
      { category: "Software", description: "GitHub Enterprise (annual)", amount: 2100, daysAgo: 68 },
      { category: "Travel", description: "Conference — SaaStr", amount: 1480.75, daysAgo: 82 },
      {
        category: "Office Supplies",
        description: "Coffee & pantry restock",
        amount: 210.3,
        daysAgo: 96,
      },
      {
        category: "Marketing",
        description: "Sponsored newsletter placement",
        amount: 750,
        daysAgo: 110,
      },
    ],
    blogPosts: [
      {
        title: "Five signs your onboarding is quietly costing you clients",
        slug: "five-signs-your-onboarding-is-costing-you-clients",
        excerpt:
          "Most first-90-day churn traces back to onboarding, not the product. Here's what we watch for.",
        status: BlogPostStatus.PUBLISHED,
        authorEmail: "owner@acme.test",
        publishedDaysAgo: 45,
        body: `## The onboarding gap

Most of the churn we see in a client's first 90 days traces back to a rocky onboarding, not the product itself. Here are five signals we watch for.

- Clients ask the same setup question more than once
- The first real "win" takes longer than two weeks to land
- Handoffs between sales and delivery lose context
- Nobody owns the client's success metric
- The kickoff call has no written agenda

Fixing even two of these usually moves retention more than a new feature would.`,
      },
      {
        title: "How we cut a client's reporting time by 70%",
        slug: "how-we-cut-reporting-time-by-70-percent",
        excerpt: "A workday a week spent assembling the same report by hand — and how we removed it.",
        status: BlogPostStatus.PUBLISHED,
        authorEmail: "accountant@acme.test",
        publishedDaysAgo: 20,
        body: `## From ten hours to three

A mid-market client was spending most of a workday every week assembling the same board report by hand. We mapped the process, cut three redundant approval steps, and wired the numbers straight into a single dashboard.

The result was a **70% reduction** in reporting time and, more importantly, numbers everyone finally trusted.`,
      },
      {
        title: "A practical guide to scoping consulting engagements",
        slug: "practical-guide-to-scoping-consulting-engagements",
        excerpt: "Good scoping protects both sides. We agree on three things before signing anything.",
        status: BlogPostStatus.PUBLISHED,
        authorEmail: "member@acme.test",
        publishedDaysAgo: 6,
        body: `## Scope is a conversation, not a document

Good scoping protects both sides. Before we sign anything, we agree on three things in writing:

1. The single outcome that defines success
2. What is explicitly out of scope for this phase
3. How we handle change requests

It sounds simple. It prevents almost every awkward conversation later.`,
      },
      {
        title: "What we're building next at Acme",
        slug: "what-were-building-next-at-acme",
        excerpt: "A placeholder while we finish writing up our self-serve engagement planner.",
        status: BlogPostStatus.DRAFT,
        authorEmail: "owner@acme.test",
        body: `## Coming soon

We're putting the finishing touches on a self-serve engagement planner. This post is a draft placeholder while we finish writing it up.`,
      },
    ],
  },
  {
    name: "Nimbus Retail",
    slug: "nimbus-retail",
    users: [
      { email: "owner@nimbus.test", name: "Nadia Owner", role: Role.OWNER },
      { email: "accountant@nimbus.test", name: "Owen Accountant", role: Role.ACCOUNTANT },
      { email: "member@nimbus.test", name: "Miles Member", role: Role.MEMBER },
      {
        email: "client@nimbus.test",
        name: "Nora Guest",
        role: Role.CLIENT_GUEST,
        guestOfClient: "Northwind Traders",
      },
    ],
    clients: [
      {
        name: "Northwind Traders",
        email: "finance@northwindtraders.test",
        phone: "+1-555-0201",
        billingAddress: "77 Northwind Rd, Seattle, WA",
      },
      {
        name: "Cedar & Co",
        email: "billing@cedarandco.test",
        phone: "+1-555-0202",
        billingAddress: "19 Cedar Ln, Boise, ID",
      },
      {
        name: "Vantage Outfitters",
        email: "ap@vantageoutfitters.test",
        phone: "+1-555-0203",
        billingAddress: "203 Vantage Way, Denver, CO",
      },
      {
        name: "Meridian Grocers",
        email: "ap@meridiangrocers.test",
        phone: "+1-555-0204",
        billingAddress: "410 Market St, Columbus, OH",
      },
      {
        name: "Pinecrest Home Goods",
        email: "billing@pinecresthome.test",
        phone: "+1-555-0205",
        billingAddress: "77 Pinecrest Ave, Raleigh, NC",
      },
      {
        name: "Coastal Apparel Co",
        email: "finance@coastalapparel.test",
        phone: "+1-555-0206",
        billingAddress: "8 Seaside Blvd, San Diego, CA",
      },
    ],
    invoices: [
      // Northwind Traders (the CLIENT_GUEST's client) recurs across statuses.
      {
        clientName: "Northwind Traders",
        status: InvoiceStatus.PAID,
        issueDaysAgo: 175,
        items: [
          { description: "Wholesale order — spring linens", quantity: 120, unitPrice: 45 },
          { description: "Freight & handling", quantity: 1, unitPrice: 600 },
        ],
      },
      {
        clientName: "Cedar & Co",
        status: InvoiceStatus.PAID,
        issueDaysAgo: 168,
        items: [
          { description: "POS system license (annual)", quantity: 1, unitPrice: 2400 },
          { description: "Onsite installation", quantity: 1, unitPrice: 800 },
        ],
      },
      {
        clientName: "Vantage Outfitters",
        status: InvoiceStatus.OVERDUE,
        issueDaysAgo: 160,
        items: [{ description: "Seasonal apparel restock", quantity: 200, unitPrice: 22 }],
      },
      {
        clientName: "Meridian Grocers",
        status: InvoiceStatus.SENT,
        issueDaysAgo: 151,
        items: [{ description: "Refrigerated display units", quantity: 4, unitPrice: 1350 }],
      },
      {
        clientName: "Northwind Traders",
        status: InvoiceStatus.PAID,
        issueDaysAgo: 143,
        items: [{ description: "Bulk packaging supplies", quantity: 5000, unitPrice: 0.6 }],
      },
      {
        clientName: "Pinecrest Home Goods",
        status: InvoiceStatus.PAID,
        issueDaysAgo: 135,
        items: [{ description: "Home decor collection order", quantity: 300, unitPrice: 28 }],
      },
      {
        clientName: "Coastal Apparel Co",
        status: InvoiceStatus.VOID,
        issueDaysAgo: 127,
        items: [{ description: "Sample production run", quantity: 1, unitPrice: 1750 }],
      },
      {
        clientName: "Cedar & Co",
        status: InvoiceStatus.SENT,
        issueDaysAgo: 119,
        items: [
          { description: "Store fixture refresh", quantity: 1, unitPrice: 3900 },
          { description: "Visual merchandising consult", quantity: 1, unitPrice: 700 },
        ],
      },
      {
        clientName: "Northwind Traders",
        status: InvoiceStatus.OVERDUE,
        issueDaysAgo: 110,
        items: [{ description: "Warehouse inventory audit", quantity: 1, unitPrice: 2200 }],
      },
      {
        clientName: "Vantage Outfitters",
        status: InvoiceStatus.PAID,
        issueDaysAgo: 98,
        items: [{ description: "Outdoor gear wholesale lot", quantity: 150, unitPrice: 36 }],
      },
      {
        clientName: "Meridian Grocers",
        status: InvoiceStatus.SENT,
        issueDaysAgo: 85,
        items: [{ description: "Loyalty program setup", quantity: 1, unitPrice: 4100 }],
      },
      {
        clientName: "Pinecrest Home Goods",
        status: InvoiceStatus.DRAFT,
        issueDaysAgo: 72,
        items: [
          { description: "Holiday catalog print run", quantity: 2000, unitPrice: 1.2 },
          { description: "Design & layout", quantity: 1, unitPrice: 900 },
        ],
      },
      {
        clientName: "Coastal Apparel Co",
        status: InvoiceStatus.PAID,
        issueDaysAgo: 60,
        items: [{ description: "Summer collection wholesale", quantity: 240, unitPrice: 29 }],
      },
      {
        clientName: "Northwind Traders",
        status: InvoiceStatus.VOID,
        issueDaysAgo: 47,
        items: [{ description: "Cancelled rush shipment", quantity: 1, unitPrice: 1500 }],
      },
      {
        clientName: "Cedar & Co",
        status: InvoiceStatus.OVERDUE,
        issueDaysAgo: 38,
        items: [{ description: "Annual maintenance contract", quantity: 1, unitPrice: 3600 }],
      },
      {
        clientName: "Meridian Grocers",
        status: InvoiceStatus.VOID,
        issueDaysAgo: 22,
        items: [{ description: "Duplicate stock order", quantity: 1, unitPrice: 2500 }],
      },
      {
        clientName: "Northwind Traders",
        status: InvoiceStatus.SENT,
        issueDaysAgo: 14,
        items: [{ description: "Q4 replenishment order", quantity: 180, unitPrice: 32 }],
      },
      {
        clientName: "Coastal Apparel Co",
        status: InvoiceStatus.DRAFT,
        issueDaysAgo: 9,
        items: [{ description: "Pre-order — winter line", quantity: 100, unitPrice: 41 }],
      },
    ],
    expenses: [
      { category: "Software", description: "Shopify Plus subscription", amount: 2000, daysAgo: 6 },
      { category: "Travel", description: "Buyer trip — LA showroom", amount: 980, daysAgo: 18 },
      {
        category: "Office Supplies",
        description: "Warehouse label printer",
        amount: 430,
        daysAgo: 29,
      },
      {
        category: "Marketing",
        description: "Instagram influencer campaign",
        amount: 1800,
        daysAgo: 44,
      },
      { category: "Contractors", description: "Seasonal merchandiser", amount: 1600, daysAgo: 52 },
      { category: "Software", description: "POS analytics add-on", amount: 340, daysAgo: 64 },
      { category: "Travel", description: "Trade show — Vegas Market", amount: 2250.5, daysAgo: 79 },
      {
        category: "Office Supplies",
        description: "Packing & shipping supplies",
        amount: 615.8,
        daysAgo: 91,
      },
      { category: "Marketing", description: "Print catalog design", amount: 1120, daysAgo: 105 },
    ],
    blogPosts: [
      {
        title: "Getting your store ready for the holiday rush",
        slug: "getting-your-store-ready-for-the-holiday-rush",
        excerpt: "The busiest six weeks of the year are won in the quiet months before them.",
        status: BlogPostStatus.PUBLISHED,
        authorEmail: "owner@nimbus.test",
        publishedDaysAgo: 40,
        body: `## Peak season starts in the back office

The busiest six weeks of the year are won in the quiet months before them. A few things we do every autumn:

- Lock in supplier lead times early
- Pre-stage your best sellers, not just your newest arrivals
- Give seasonal staff a one-page returns cheat sheet

Small preparation, large payoff.`,
      },
      {
        title: "Inventory forecasting without the spreadsheet sprawl",
        slug: "inventory-forecasting-without-the-spreadsheets",
        excerpt: "Replace the tangle of tabs with a simple weekly rhythm your team will actually use.",
        status: BlogPostStatus.PUBLISHED,
        authorEmail: "accountant@nimbus.test",
        publishedDaysAgo: 15,
        body: `## Forecasting without the spreadsheet sprawl

Every store we work with starts with the same tangle of tabs. We replace it with a simple weekly rhythm: last year's numbers, this year's trend, and one adjustment per category.

You lose the false precision and gain a forecast people actually use.`,
      },
      {
        title: "Why we switched to weekly supplier check-ins",
        slug: "why-we-switched-to-weekly-supplier-checkins",
        excerpt: "A fifteen-minute weekly call caught two stockouts before they happened.",
        status: BlogPostStatus.PUBLISHED,
        authorEmail: "member@nimbus.test",
        publishedDaysAgo: 4,
        body: `## Weekly beats quarterly

We used to review suppliers once a quarter. Switching to a fifteen-minute weekly check-in caught two stockouts before they happened and saved a holiday launch.

Cadence beats depth.`,
      },
      {
        title: "Our 2026 sustainability roadmap",
        slug: "our-2026-sustainability-roadmap",
        excerpt: "A working draft of our packaging and shipping footprint goals for 2026.",
        status: BlogPostStatus.DRAFT,
        authorEmail: "owner@nimbus.test",
        body: `## Our sustainability roadmap

A working draft of where we want our packaging and shipping footprint to be by the end of 2026. Still gathering supplier commitments before we publish.`,
      },
    ],
  },
];

const expenseCategories = ["Software", "Travel", "Office Supplies", "Marketing", "Contractors"];

function money(n: number): string {
  return n.toFixed(2);
}

async function resetDatabase(): Promise<void> {
  await prisma.session.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.teamMembership.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
}

// db/init/01-report-service-role.sh creates the report_readonly role and
// grants it SELECT on these tables, but that script only ever runs once, at
// Postgres's very first boot — before `prisma migrate` has created any
// tables. Re-asserting the grants here, after migrations, is what actually
// makes them stick; every seed run keeps a fresh volume self-healing rather
// than relying on init-script ordering.
async function grantReportServiceReadAccess(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    DO $grant$
    BEGIN
      IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'report_readonly') THEN
        GRANT SELECT ON companies, clients, invoices, invoice_items, expenses TO report_readonly;
      END IF;
    END
    $grant$;
  `);
}

async function main(): Promise<void> {
  console.log("Resetting database...");
  await resetDatabase();
  await grantReportServiceReadAccess();

  for (const companySpec of companies) {
    console.log(`\nSeeding company: ${companySpec.name}`);

    const company = await prisma.company.create({
      data: { name: companySpec.name, slug: companySpec.slug },
    });

    const clientsByName = new Map<string, { id: string }>();
    for (const clientSpec of companySpec.clients) {
      const client = await prisma.client.create({
        data: {
          companyId: company.id,
          name: clientSpec.name,
          email: clientSpec.email,
          phone: clientSpec.phone,
          billingAddress: clientSpec.billingAddress,
        },
      });
      clientsByName.set(clientSpec.name, client);
    }

    const usersByRole: Partial<Record<Role, { id: string; email: string }>> = {};
    const usersByEmail = new Map<string, { id: string }>();
    for (const userSpec of companySpec.users) {
      // Distinct, rockyou-crackable password per user (see ANSWER KEY above),
      // hashed with the same bcrypt cost as always.
      const passwordHash = await hashPassword(passwordFor(userSpec.email));
      const user = await prisma.user.create({
        data: { email: userSpec.email, name: userSpec.name, passwordHash },
      });

      const guestClient = userSpec.guestOfClient
        ? clientsByName.get(userSpec.guestOfClient)
        : undefined;

      await prisma.teamMembership.create({
        data: {
          userId: user.id,
          companyId: company.id,
          role: userSpec.role,
          clientId: guestClient?.id,
        },
      });

      usersByRole[userSpec.role] = { id: user.id, email: user.email };
      usersByEmail.set(userSpec.email, { id: user.id });
    }

    const creatorId = usersByRole[Role.OWNER]?.id ?? usersByRole[Role.ACCOUNTANT]?.id;

    // Invoices — driven by the per-company spec above. subtotal is the sum of
    // the line items, tax is 8% of subtotal (rounded to cents), total =
    // subtotal + tax, exactly as the app computes it.
    let invoiceNumber = 1;
    let invoiceCount = 0;
    for (const invoiceSpec of companySpec.invoices) {
      const client = clientsByName.get(invoiceSpec.clientName);
      if (!client) {
        throw new Error(
          `Invoice references unknown client "${invoiceSpec.clientName}" in ${companySpec.name}`,
        );
      }

      const subtotal = invoiceSpec.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );
      const tax = Math.round(subtotal * 0.08 * 100) / 100;
      const total = subtotal + tax;

      const issueDate = daysAgo(invoiceSpec.issueDaysAgo);
      const dueDate = new Date(issueDate.getTime() + 30 * DAY_MS);

      await prisma.invoice.create({
        data: {
          companyId: company.id,
          clientId: client.id,
          createdById: creatorId,
          number: `INV-${String(invoiceNumber).padStart(4, "0")}`,
          status: invoiceSpec.status,
          issueDate,
          dueDate,
          subtotal: money(subtotal),
          tax: money(tax),
          total: money(total),
          items: {
            create: invoiceSpec.items.map((item, position) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: money(item.unitPrice),
              amount: money(item.quantity * item.unitPrice),
              position,
            })),
          },
        },
      });
      invoiceNumber++;
      invoiceCount++;
    }

    let expenseCount = 0;
    for (const expenseSpec of companySpec.expenses) {
      if (!expenseCategories.includes(expenseSpec.category)) {
        throw new Error(`Expense uses unknown category "${expenseSpec.category}"`);
      }
      await prisma.expense.create({
        data: {
          companyId: company.id,
          createdById: creatorId,
          category: expenseSpec.category,
          description: expenseSpec.description,
          amount: money(expenseSpec.amount),
          date: daysAgo(expenseSpec.daysAgo),
        },
      });
      expenseCount++;
    }

    let blogCount = 0;
    for (const postSpec of companySpec.blogPosts) {
      const author = usersByEmail.get(postSpec.authorEmail);
      if (!author) {
        throw new Error(
          `Blog post "${postSpec.title}" references unknown author "${postSpec.authorEmail}" in ${companySpec.name}`,
        );
      }
      await prisma.blogPost.create({
        data: {
          companyId: company.id,
          authorId: author.id,
          title: postSpec.title,
          slug: postSpec.slug,
          excerpt: postSpec.excerpt,
          body: postSpec.body,
          status: postSpec.status,
          publishedAt:
            postSpec.publishedDaysAgo != null ? daysAgo(postSpec.publishedDaysAgo) : null,
        },
      });
      blogCount++;
    }

    console.log(
      `  ${companySpec.clients.length} clients, ${invoiceCount} invoices, ${expenseCount} expenses, ${blogCount} blog posts`,
    );
  }

  console.log("\nSeed complete.\n");
  console.log("=".repeat(72));
  console.log("ANSWER KEY — seed credentials (dev only; distinct, rockyou-crackable)");
  console.log("=".repeat(72));
  for (const companySpec of companies) {
    console.log(`${companySpec.name}:`);
    for (const userSpec of companySpec.users) {
      const owner = userSpec.role === Role.OWNER ? "   <- likely YOUR login" : "";
      console.log(
        `  ${userSpec.role.padEnd(13)} ${userSpec.email.padEnd(24)} ${passwordFor(userSpec.email).padEnd(12)}${owner}`,
      );
    }
    console.log("");
  }
  console.log("bcrypt cost is unchanged (12) — the hash is strong; the passwords are weak.");
  console.log("=".repeat(72));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

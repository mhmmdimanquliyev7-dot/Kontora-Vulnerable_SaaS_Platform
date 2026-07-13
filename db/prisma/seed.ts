import "dotenv/config";
import bcrypt from "bcryptjs";

// Explicit .ts extension: this script runs directly via Node's native
// TypeScript support (see prisma.config.ts), not through tsc, so it must
// resolve the generated client's .ts source rather than a prebuilt .js file.
import { PrismaClient, Role, InvoiceStatus } from "../src/generated/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SEED_PASSWORD = "Password123!";

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
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

interface SeedCompanySpec {
  name: string;
  slug: string;
  users: SeedUserSpec[];
  clients: SeedClientSpec[];
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

  const passwordHash = await hashPassword(SEED_PASSWORD);

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
    for (const userSpec of companySpec.users) {
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
    }

    const creatorId = usersByRole[Role.OWNER]?.id ?? usersByRole[Role.ACCOUNTANT]?.id;
    const clientList = [...clientsByName.values()];

    const invoiceStatuses = [
      InvoiceStatus.PAID,
      InvoiceStatus.SENT,
      InvoiceStatus.OVERDUE,
      InvoiceStatus.DRAFT,
      InvoiceStatus.PAID,
      InvoiceStatus.SENT,
    ];

    let invoiceNumber = 1;
    for (let i = 0; i < invoiceStatuses.length; i++) {
      const client = clientList[i % clientList.length]!;
      const status = invoiceStatuses[i]!;

      const lineItems = [
        { description: "Consulting services", quantity: 10, unitPrice: 150 },
        { description: "Platform setup fee", quantity: 1, unitPrice: 500 },
      ];
      const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const tax = Math.round(subtotal * 0.08 * 100) / 100;
      const total = subtotal + tax;

      const issueDate = new Date(
        Date.now() - (invoiceStatuses.length - i) * 7 * 24 * 60 * 60 * 1000,
      );
      const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      await prisma.invoice.create({
        data: {
          companyId: company.id,
          clientId: client.id,
          createdById: creatorId,
          number: `INV-${String(invoiceNumber).padStart(4, "0")}`,
          status,
          issueDate,
          dueDate,
          subtotal: money(subtotal),
          tax: money(tax),
          total: money(total),
          items: {
            create: lineItems.map((item, position) => ({
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
    }

    for (let i = 0; i < 4; i++) {
      const category = expenseCategories[i % expenseCategories.length]!;
      await prisma.expense.create({
        data: {
          companyId: company.id,
          createdById: creatorId,
          category,
          description: `${category} expense #${i + 1}`,
          amount: money(40 + i * 37.5),
          date: new Date(Date.now() - (i + 1) * 5 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  console.log("\nSeed complete.\n");
  console.log("=".repeat(60));
  console.log("Seed credentials (dev only — do not reuse anywhere real)");
  console.log("=".repeat(60));
  console.log(`Password for every seeded user: ${SEED_PASSWORD}\n`);
  for (const companySpec of companies) {
    console.log(`${companySpec.name}:`);
    for (const userSpec of companySpec.users) {
      console.log(`  ${userSpec.role.padEnd(13)} ${userSpec.email}`);
    }
    console.log("");
  }
  console.log("=".repeat(60));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

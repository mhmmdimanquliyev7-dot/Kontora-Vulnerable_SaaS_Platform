import { GraphQLScalarType, Kind } from "graphql";

import { ForbiddenError, NotFoundError } from "@/lib/errors.js";
import { prisma } from "@/lib/prisma.js";
import * as clientService from "@/services/client.service.js";
import * as expenseService from "@/services/expense.service.js";
import * as invoiceService from "@/services/invoice.service.js";
import { Role, type InvoiceStatus } from "@kontora/db";
import type { GraphQLContext } from "@/gql/context.js";

// Resolvers deliberately call the SAME service functions the REST controllers
// do, rather than reaching for Prisma themselves. That is the tenant-scoping
// story in one line: listInvoices(viewer) already applies companyId and the
// CLIENT_GUEST row restriction, so GraphQL cannot become a second, weaker way
// to read the same data. Where a resolver does touch Prisma directly (client
// invoices below), companyId from the verified token is in the WHERE clause.

const DateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description: "An ISO-8601 date-time string.",
  serialize: (value) => (value instanceof Date ? value.toISOString() : String(value)),
  parseValue: (value) => new Date(String(value)),
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? new Date(ast.value) : null),
});

// Decimal columns come back as Prisma Decimal objects; GraphQL String fields
// need real strings. Keeping them as strings (not Float) preserves exact
// money values — the REST API makes the same choice.
function dec(value: unknown): string {
  return String(value);
}

function viewerOf(ctx: GraphQLContext) {
  return { userId: ctx.auth.userId, companyId: ctx.auth.companyId, role: ctx.auth.role };
}

function assertNotClientGuest(ctx: GraphQLContext): void {
  if (ctx.auth.role === Role.CLIENT_GUEST) {
    throw new ForbiddenError("You do not have permission to perform this action.");
  }
}

function assertCanSeeExpenses(ctx: GraphQLContext): void {
  if (ctx.auth.role !== Role.OWNER && ctx.auth.role !== Role.ACCOUNTANT) {
    throw new ForbiddenError("You do not have permission to perform this action.");
  }
}

export const resolvers = {
  DateTime: DateTimeScalar,

  Query: {
    me: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const [user, company] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { id: ctx.auth.userId } }),
        prisma.company.findUniqueOrThrow({ where: { id: ctx.auth.companyId } }),
      ]);
      return { user, company, role: ctx.auth.role };
    },

    clients: async (_p: unknown, args: { search?: string }, ctx: GraphQLContext) => {
      assertNotClientGuest(ctx);
      return clientService.listClients({ companyId: ctx.auth.companyId, search: args.search });
    },

    client: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      assertNotClientGuest(ctx);
      try {
        return await clientService.getClient(ctx.auth.companyId, args.id);
      } catch (err) {
        if (err instanceof NotFoundError) return null;
        throw err;
      }
    },

    invoices: async (
      _p: unknown,
      args: { status?: InvoiceStatus; clientId?: string },
      ctx: GraphQLContext,
    ) => invoiceService.listInvoices(viewerOf(ctx), { status: args.status, clientId: args.clientId }),

    invoice: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      try {
        return await invoiceService.getInvoice(viewerOf(ctx), args.id);
      } catch (err) {
        if (err instanceof NotFoundError) return null;
        throw err;
      }
    },

    expenses: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      assertCanSeeExpenses(ctx);
      return expenseService.listExpenses({ companyId: ctx.auth.companyId });
    },
  },

  Client: {
    // Scoped by companyId from the token, not from the parent object, so a
    // client row can never be used to pivot into another tenant's invoices.
    invoices: async (parent: { id: string }, _a: unknown, ctx: GraphQLContext) =>
      prisma.invoice.findMany({
        where: { clientId: parent.id, companyId: ctx.auth.companyId },
        include: { client: true, items: { orderBy: { position: "asc" } } },
        orderBy: { issueDate: "desc" },
      }),
  },

  Invoice: {
    subtotal: (p: { subtotal: unknown }) => dec(p.subtotal),
    tax: (p: { tax: unknown }) => dec(p.tax),
    total: (p: { total: unknown }) => dec(p.total),
  },

  InvoiceItem: {
    quantity: (p: { quantity: unknown }) => dec(p.quantity),
    unitPrice: (p: { unitPrice: unknown }) => dec(p.unitPrice),
    amount: (p: { amount: unknown }) => dec(p.amount),
  },

  Expense: {
    amount: (p: { amount: unknown }) => dec(p.amount),
  },
};

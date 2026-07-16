// The GraphQL surface is deliberately READ-ONLY. Every mutation Kontora
// supports already has a REST endpoint carrying its own validation, role gate,
// activity logging and webhook dispatch; duplicating those write paths here
// would mean two places to keep those rules in sync. This endpoint exists to
// let a caller *read* across invoices/clients/expenses in one round trip.
export const typeDefs = /* GraphQL */ `
  scalar DateTime

  enum Role {
    OWNER
    ACCOUNTANT
    MEMBER
    CLIENT_GUEST
  }

  enum InvoiceStatus {
    DRAFT
    SENT
    PAID
    OVERDUE
    VOID
  }

  type Company {
    id: ID!
    name: String!
    slug: String!
    website: String
    address: String
    description: String
  }

  type User {
    id: ID!
    email: String!
    name: String!
  }

  type Viewer {
    user: User!
    company: Company!
    role: Role!
  }

  type Client {
    id: ID!
    name: String!
    email: String
    phone: String
    billingAddress: String
    notes: String
    invoices: [Invoice!]!
  }

  type InvoiceItem {
    id: ID!
    description: String!
    quantity: String!
    unitPrice: String!
    amount: String!
    position: Int!
  }

  type Invoice {
    id: ID!
    number: String!
    status: InvoiceStatus!
    issueDate: DateTime!
    dueDate: DateTime!
    currency: String!
    subtotal: String!
    tax: String!
    total: String!
    notes: String
    client: Client!
    items: [InvoiceItem!]!
  }

  type Expense {
    id: ID!
    category: String!
    description: String!
    amount: String!
    currency: String!
    date: DateTime!
  }

  type Query {
    "The caller, their active company, and their role in it."
    me: Viewer!
    "Clients in the caller's company. Not available to CLIENT_GUEST."
    clients(search: String): [Client!]!
    client(id: ID!): Client
    "Invoices in the caller's company. A CLIENT_GUEST only ever sees their own."
    invoices(status: InvoiceStatus, clientId: ID): [Invoice!]!
    invoice(id: ID!): Invoice
    "Expenses. OWNER/ACCOUNTANT only, matching the REST route's role gate."
    expenses: [Expense!]!
  }
`;

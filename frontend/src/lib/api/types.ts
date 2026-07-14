export type Role = "OWNER" | "ACCOUNTANT" | "MEMBER" | "CLIENT_GUEST";

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  address: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyMembership {
  id: string;
  name: string;
  role: Role;
}

export interface Client {
  id: string;
  companyId: string;
  name: string;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  position: number;
}

export interface Invoice {
  id: string;
  companyId: string;
  clientId: string;
  createdById: string | null;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: string;
  tax: string;
  total: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  client: Client;
  items: InvoiceItem[];
}

export interface Expense {
  id: string;
  companyId: string;
  createdById: string | null;
  category: string;
  description: string;
  amount: string;
  currency: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  membershipId: string;
  role: Role;
  clientId: string | null;
  user: User;
}

export interface DashboardSummary {
  totalRevenue: string | number;
  outstandingAmount: string | number;
  overdueCount: number;
  totalExpenses: string | number;
  clientCount: number;
  invoiceCount: number;
  recentActivity: ActivityEntry[];
}

export interface ActivityEntry {
  id: string;
  companyId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string } | null;
}

export interface ActivityPage {
  entries: ActivityEntry[];
  total: number;
  limit: number;
  offset: number;
}

export type LoginResult =
  | { status: "authenticated"; user: User; company: Company; role: Role }
  | { status: "company_selection_required"; loginToken: string; companies: CompanyMembership[] };

export interface MeResult {
  user: User;
  company: Company;
  role: Role;
  companies: CompanyMembership[];
}

export type WebhookEvent = "invoice.created" | "invoice.paid";

export interface Webhook {
  id: string;
  companyId: string;
  url: string;
  description: string | null;
  isActive: boolean;
  events: WebhookEvent[];
  createdAt: string;
  updatedAt: string;
  /** Present on list/get responses; the full secret is never returned again after creation. */
  secretPreview?: string;
  /** Present only in the response to a successful create — shown once. */
  secret?: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  statusCode: number | null;
  success: boolean;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

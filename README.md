# Kontora

Kontora is a B2B SaaS invoicing and client-management platform. This repo is a
portfolio project built to production-quality standards.

Built in chapters: chapter 1 was the clean project skeleton, chapter 2 added
the data model and authentication, and chapter 3 (this one) adds the core
API — clients, invoices, expenses, team management, dashboard, company
settings, and an activity log.

## Stack

| Layer    | Tech                                                                    |
| -------- | ----------------------------------------------------------------------- |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS                   |
| API      | Node.js, Express, TypeScript (routes → controllers → services → models) |
| Database | PostgreSQL, Prisma ORM                                                  |
| Cache    | Redis                                                                   |
| Infra    | Docker Compose                                                          |

## Monorepo layout

```
kontora/
├── frontend/    # Next.js app
├── api/         # Express API
├── db/          # Prisma schema, migrations, generated client
└── docker-compose.yml
```

npm workspaces tie the three packages together (`@kontora/api`,
`@kontora/db`, `frontend`) so the API can import the Prisma client directly
via `@kontora/db`.

## Getting started

### Option A — Docker Compose (recommended)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000
- API health check: http://localhost:4000/api/health
- Postgres: localhost:5433 (see `.env.example` for why not 5432)
- Redis: localhost:6379

Then apply migrations and load seed data (see [Seed data](#seed-data) below).

### Option B — Run services locally

```bash
npm install

# copy env files
cp api/.env.example api/.env
cp db/.env.example db/.env
cp frontend/.env.example frontend/.env
# set a real JWT_SECRET in api/.env — openssl rand -hex 32

# start just the datastores in Docker
docker compose up postgres redis

# generate the Prisma client, apply migrations, seed
npm run db:generate
npm run db:migrate:docker
npm run db:seed:docker

# run the API and frontend in separate terminals
npm run dev:api
npm run dev:frontend
```

If `npm run dev:api` can't reach Postgres from the host, see
[Troubleshooting](#troubleshooting) — the API itself runs on plain HTTP so
it's unaffected, but its _connection to Postgres_ hits the same host→Postgres
issue as the CLI. On a machine where that's the case, run the API in Docker
too (`docker compose up api`) instead of `npm run dev:api`.

## Scripts (root)

| Command                | Description                         |
| ---------------------- | ----------------------------------- |
| `npm run dev:api`      | Run the API in watch mode           |
| `npm run dev:frontend` | Run the Next.js dev server          |
| `npm run build`        | Build db → api → frontend, in order |
| `npm run lint`         | Lint all workspaces                 |
| `npm run format`       | Format the whole repo with Prettier |
| `npm run db:generate`  | Generate the Prisma client          |
| `npm run db:migrate`   | Run Prisma migrations in dev mode   |
| `npm run db:seed`      | Seed the database (see below)       |
| `npm run db:studio`    | Open Prisma Studio                  |

Each also has a `:docker` variant (`db:migrate:docker`, `db:seed:docker`,
`db:studio:docker`) that runs the same command inside Docker's network
instead of from the host — see [Troubleshooting](#troubleshooting).

## Health check

`GET /api/health` reports API status plus live connectivity to Postgres and
Redis:

```json
{
  "status": "ok",
  "uptimeSeconds": 12,
  "timestamp": "2026-07-12T10:00:00.000Z",
  "dependencies": { "database": "up", "redis": "up" }
}
```

## Data model

Multi-tenant: every row that belongs to a business lives under a `Company`
(the tenant). A `User` is a global identity with no company or role of its
own — permissions are granted per company via `TeamMembership`, so the same
person can be `OWNER` of one company and `MEMBER` of another without either
role leaking into the other tenant. This is deliberate: putting role on
`User` directly is a common multi-tenant design mistake.

```
Company ─┬─ TeamMembership ─── User
          ├─ Client ─── Invoice ─── InvoiceItem
          ├─ Invoice
          ├─ Expense
          ├─ Session
          └─ ActivityLog
```

- **TeamMembership.role**: `OWNER | ACCOUNTANT | MEMBER | CLIENT_GUEST`,
  scoped to a single `(userId, companyId)` pair.
- **CLIENT_GUEST**: a portal login for the company's own customer. Its
  membership carries `clientId`, restricting it to that one `Client`'s
  invoices — enforced in the service layer (`invoice.service.ts`), not just
  by hiding UI.
- **Session**: one row per refresh token = one logged-in session, scoped to
  a specific company context. Access tokens are short-lived JWTs derived
  from a session and never stored server-side.
- **ActivityLog**: append-only audit trail, written by services after a
  successful write.
- `Invoice.client` is `onDelete: Restrict`, not `Cascade` — deleting a
  client with existing invoices is rejected (409) rather than silently
  deleting revenue history.
- `Company` also carries `website`, `address`, and `logoUrl` (company
  settings/branding).

## Authentication

Email/password with JWT access tokens + opaque, rotating refresh tokens,
both delivered as `httpOnly` cookies (never exposed to JS, so an XSS bug
can't steal them directly):

- `kontora_at` — access token (JWT, 15 min default, path `/`)
- `kontora_rt` — refresh token (opaque random value, 30 days default, path
  `/api/auth` only)

Passwords are hashed with bcrypt (via `bcryptjs`, 12 rounds). Login runs
`bcrypt.compare` against a dummy hash even for an unknown email, so response
timing can't be used to enumerate registered addresses.

Refresh tokens are stored server-side only as a SHA-256 hash (`Session.refreshTokenHash`) — a database leak can't be used to forge sessions. Each refresh
**rotates** the token (old one revoked, new one issued); presenting an
already-rotated token is treated as a signal of leakage and revokes every
session for that user, not just the one being reused.

A user can belong to more than one company. If login resolves to exactly
one membership, it signs in directly; with more than one, it returns a
short-lived `loginToken` and the list of companies instead of a session —
the client calls `POST /api/auth/select-company` to finish signing in.
`POST /api/auth/switch-company` moves an already-authenticated session to a
different company the user belongs to.

### Endpoints

| Method | Path                       | Auth           | Notes                                                         |
| ------ | -------------------------- | -------------- | ------------------------------------------------------------- |
| POST   | `/api/auth/register`       | —              | Creates a new Company + OWNER                                 |
| POST   | `/api/auth/login`          | —              | May return `company_selection_required`                       |
| POST   | `/api/auth/select-company` | loginToken     | Completes login for multi-company users                       |
| POST   | `/api/auth/refresh`        | refresh cookie | Rotates tokens                                                |
| POST   | `/api/auth/logout`         | refresh cookie | Revokes the current session                                   |
| POST   | `/api/auth/logout-all`     | session        | Revokes every session for the user                            |
| POST   | `/api/auth/switch-company` | session        | Moves session to another membership                           |
| GET    | `/api/auth/me`             | session        | Current user, company, role, all memberships                  |
| GET    | `/api/clients`             | session        | OWNER/ACCOUNTANT/MEMBER                                       |
| GET    | `/api/invoices`            | session        | All roles; CLIENT_GUEST sees only their own client's invoices |
| GET    | `/api/expenses`            | session        | OWNER/ACCOUNTANT only                                         |
| GET    | `/api/team`                | session        | OWNER/ACCOUNTANT only                                         |

## API reference

Every write endpoint validates its body with zod; every endpoint scopes to
`req.auth.companyId` from the verified access token, never a request
param/body/query — a client cannot address another tenant's data by editing
an id. Cross-tenant reads/writes return `404` (not `403`), so a guessed id
from another company doesn't even confirm the record exists.

### Clients

| Method | Path               | Role                    | Notes                            |
| ------ | ------------------ | ----------------------- | -------------------------------- |
| GET    | `/api/clients`     | OWNER/ACCOUNTANT/MEMBER | `?search=` matches name or email |
| GET    | `/api/clients/:id` | OWNER/ACCOUNTANT/MEMBER |                                  |
| POST   | `/api/clients`     | OWNER/ACCOUNTANT/MEMBER |                                  |
| PATCH  | `/api/clients/:id` | OWNER/ACCOUNTANT/MEMBER |                                  |
| DELETE | `/api/clients/:id` | OWNER/ACCOUNTANT        | 409 if the client has invoices   |

### Invoices

| Method | Path                       | Role                    | Notes                                                   |
| ------ | -------------------------- | ----------------------- | ------------------------------------------------------- |
| GET    | `/api/invoices`            | all roles               | `?status=`, `?clientId=`; CLIENT_GUEST row-restricted   |
| GET    | `/api/invoices/:id`        | all roles               | Same row restriction                                    |
| GET    | `/api/invoices/:id/pdf`    | all roles               | Streams a generated PDF (`application/pdf`)             |
| POST   | `/api/invoices`            | OWNER/ACCOUNTANT/MEMBER | Totals always computed server-side from `items`         |
| PATCH  | `/api/invoices/:id`        | OWNER/ACCOUNTANT/MEMBER | 409 unless the invoice is still DRAFT                   |
| PATCH  | `/api/invoices/:id/status` | OWNER/ACCOUNTANT        | Enforces the DRAFT→SENT→PAID/OVERDUE→VOID state machine |
| DELETE | `/api/invoices/:id`        | OWNER/ACCOUNTANT        | 409 unless DRAFT — void a sent/paid invoice instead     |

`subtotal`/`tax`/`total` are never accepted from the client — they're
recomputed from `items` and `taxRate` on every create/update. Editing is
disabled once an invoice leaves DRAFT, so a sent/paid invoice's recorded
amounts can't drift after the fact.

### Expenses

All endpoints OWNER/ACCOUNTANT only — same rationale as the dashboard.

| Method | Path                       | Notes                            |
| ------ | -------------------------- | -------------------------------- |
| GET    | `/api/expenses`            | `?category=`                     |
| GET    | `/api/expenses/categories` | Suggested + in-use category list |
| GET    | `/api/expenses/:id`        |                                  |
| POST   | `/api/expenses`            |                                  |
| PATCH  | `/api/expenses/:id`        |                                  |
| DELETE | `/api/expenses/:id`        |                                  |

### Team

| Method | Path                           | Role             | Notes                                                                               |
| ------ | ------------------------------ | ---------------- | ----------------------------------------------------------------------------------- |
| GET    | `/api/team`                    | OWNER/ACCOUNTANT | Roster                                                                              |
| POST   | `/api/team/invite`             | OWNER            | See the note below on invited users' passwords                                      |
| PATCH  | `/api/team/:membershipId/role` | OWNER            | 409 if it would leave the company with 0 owners                                     |
| DELETE | `/api/team/:membershipId`      | OWNER            | Same last-owner protection; also revokes their sessions in this company immediately |

Inviting an email with no existing account creates the `User` with a
random, never-returned password — there's no email delivery in this
project yet, so that account can't log in until a password-reset flow
exists. Inviting an email that already has an account elsewhere links them
to this company instead.

### Dashboard

| Method | Path                     | Role             |
| ------ | ------------------------ | ---------------- |
| GET    | `/api/dashboard/summary` | OWNER/ACCOUNTANT |

Returns `totalRevenue` (sum of PAID invoices), `outstandingAmount` (sum of
SENT+OVERDUE), `overdueCount` (explicit OVERDUE plus SENT past its due
date), `totalExpenses`, `clientCount`, `invoiceCount`, and the 5 most
recent activity log entries.

### Company settings

| Method | Path                | Role      | Notes                                          |
| ------ | ------------------- | --------- | ---------------------------------------------- |
| GET    | `/api/company`      | all roles |                                                |
| PATCH  | `/api/company`      | OWNER     | name/website/address                           |
| POST   | `/api/company/logo` | OWNER     | multipart `logo` field, PNG/JPEG/WebP, max 2MB |

The uploaded logo is re-encoded through `sharp` (resized, converted to
PNG) rather than saved as-is — this both normalizes the format and acts as
a stronger validity check than trusting the client's declared
Content-Type: sharp rejects anything it can't actually decode as an image.
The stored filename is always `{companyId}.png`, never derived from the
client's original filename, so there's no path-traversal surface. Served
back at `/uploads/logos/{companyId}.png`.

### Activity log

| Method | Path            | Role             | Notes                           |
| ------ | --------------- | ---------------- | ------------------------------- |
| GET    | `/api/activity` | OWNER/ACCOUNTANT | `?limit=` (max 100), `?offset=` |

Written by services after a successful mutation (`client.created`,
`invoice.status_changed`, `team.role_changed`, ...) — never by controllers
directly, so no write path can skip it. A logging failure is swallowed and
logged server-side rather than failing the request that triggered it.

`/api/auth/login` and `/api/auth/register` are rate-limited (Redis-backed,
shared across replicas) to slow down credential stuffing / brute force.

### Tenant isolation

`requireAuth` verifies the access token and attaches `req.auth = { userId,
companyId, role, sessionId }`. `companyId` comes only from the signed
token — never from a request param, body, or query string — so every
service function filters its Prisma query by `req.auth.companyId` and a
client has no field to edit to address another tenant's data. `requireRole`
checks `req.auth.role` against an allowlist per route.

### Seed data

```bash
docker compose up -d postgres redis
npm run db:migrate:docker   # or npm run db:migrate if host->Postgres works for you
npm run db:seed:docker      # or npm run db:seed
```

Two companies, all passwords `Password123!` (dev-only — never reuse):

| Company         | Role         | Email                  |
| --------------- | ------------ | ---------------------- |
| Acme Consulting | OWNER        | owner@acme.test        |
| Acme Consulting | ACCOUNTANT   | accountant@acme.test   |
| Acme Consulting | MEMBER       | member@acme.test       |
| Acme Consulting | MEMBER       | member2@acme.test      |
| Acme Consulting | CLIENT_GUEST | client@acme.test       |
| Nimbus Retail   | OWNER        | owner@nimbus.test      |
| Nimbus Retail   | ACCOUNTANT   | accountant@nimbus.test |
| Nimbus Retail   | MEMBER       | member@nimbus.test     |
| Nimbus Retail   | CLIENT_GUEST | client@nimbus.test     |

Each company also gets 3 clients, 6 invoices (mixed statuses), and 4
expenses. Re-running the seed wipes and recreates everything.

## Troubleshooting

**`prisma migrate`/`db seed` fail with a password/auth error on this
machine, even though the credentials are correct.** On some setups, direct
host → Docker-published-port connections to Postgres are silently
intercepted before reaching the container (confirmed here via `docker exec`
working while an identical host connection didn't, on multiple ports and
Postgres images — likely local security software or a conflicting local
Postgres install). Redis and the API's own HTTP port are unaffected; it's
specific to Postgres connections initiated from the host.

Workaround: run Prisma CLI commands from _inside_ Docker's network instead
of from the host:

```bash
npm run db:migrate:docker    # docker compose run --rm migrate migrate dev
npm run db:seed:docker       # docker compose run --rm migrate db seed
npm run db:studio:docker     # docker compose run --rm --service-ports migrate studio -p 5555 -b 0.0.0.0
```

If `db:migrate`/`db:seed` (without `:docker`) work fine for you, ignore
this — it's a local-machine networking quirk, not a project issue.

## Status

Data model, authentication, and the core API (clients, invoices, expenses,
team, dashboard, company settings, activity log) are in place — all
tenant-scoped, role-checked, and zod-validated. No frontend UI yet; every
endpoint above has only been exercised via the API directly. That, plus a
real password-reset flow (see the Team section's note on invited users),
is the natural next chapter.

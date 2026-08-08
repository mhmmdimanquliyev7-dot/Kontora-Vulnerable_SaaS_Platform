# Kontora — SQL Injection Recon (read-only architecture review)

Scope: inventory the existing data layer and read features so a reviewer can choose where to introduce SQL‑injection variants into an **existing** feature. Nothing was built or changed. All paths are repo‑relative.

> **Headline:** a string‑interpolated raw SQL sink already exists at `api/src/controllers/invoice.controller.ts:104` (`GET /api/invoices/lookup?number=`), reachable by the lowest‑privilege authenticated role, not tenant‑scoped, and the API connects to Postgres as a **superuser** (`kontora`). Everything else is Prisma/PDO‑parameterized.

---

## 1. Data layer

**Who owns Postgres access**
- **`api`** (Node.js / Express / TypeScript) is the primary data owner. It uses a single shared Prisma client: `db/src/index.ts` instantiates it and `api/src/lib/prisma.ts` just re‑exports it (`export { prisma } from "@kontora/db";`).
- **`services/report-service`** (PHP 8.3 / Apache) also reads Postgres directly via PDO for its reports/CSV import: `services/report-service/src/db.php` (connection), `reports.php`, `named_reports.php`.
- `services/export-worker` (Java) holds **no** DB credentials (stateless); `mongo` backs only invoice comments — neither is a SQL surface.

**ORM / client / version**
- Prisma **7.8.0** using the **driver adapter** `@prisma/adapter-pg` **7.8.0** over node‑postgres **`pg` 8.22.0** (`db/package.json:21‑26`; adapter wired in `db/src/index.ts:1,11‑14`). Provider `postgresql` (`db/prisma/schema.prisma:13‑15`).
- PHP side: PDO with `PDO::ATTR_EMULATE_PREPARES => false` (real server‑side prepares) — `services/report-service/src/db.php:32‑41`.

**How queries are written — parameterized vs interpolated**
- Overwhelmingly Prisma query‑builder (parameterized). Representative **safe** example — client search uses Prisma `contains`, values bound, not concatenated:
  ```ts
  // api/src/services/client.service.ts:14‑29
  prisma.client.findMany({
    where: { companyId: params.companyId,
      ...(params.search ? { OR: [
        { name:  { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ] } : {}) },
    orderBy: { name: "asc" } });
  ```
- **Raw, string‑interpolated (INJECTABLE)** — the one true sink:
  ```ts
  // api/src/controllers/invoice.controller.ts:101‑108
  export async function lookupByNumber(req, res) {
    const number = req.query.number as string;
    const invoices = await prisma.$queryRawUnsafe(
      `SELECT id, number, status, total FROM invoices WHERE number = '${number}'`,
    );
    res.status(200).json({ invoices });
  }
  ```
  No zod validation, no `companyId` filter, value dropped straight into a single‑quoted string context.
- Other raw usages are **not** attacker‑controlled: `db/prisma/seed.ts:658` (`$executeRawUnsafe` of a static `DO $$…$$` grant block), and health probes `prisma.$queryRaw\`SELECT 1\`` at `api/src/services/health.service.ts:20` and `api/src/controllers/diagnostics.controller.ts:86` (tagged‑template, parameterized).
- PHP reports are **parameterized** — every statement binds `:companyId` (`services/report-service/src/reports.php:11,18,28,34,56`; `named_reports.php:29‑54,151‑152`).

**Postgres version:** `postgres:18` (`docker-compose.yml:5`).

**DB role the app connects as (names only)**
- **API → role `kontora`** (superuser). Connection string uses `${POSTGRES_USER:-kontora}` (`docker-compose.yml:180`, prod overlay `docker-compose.prod.yml` inherits it); `POSTGRES_USER: ${POSTGRES_USER:-kontora}` (`docker-compose.yml:8`). The official `postgres` image creates `POSTGRES_USER` as a **SUPERUSER** — so the SQLi sink above executes with superuser rights.
- **report-service → role `report_readonly`** (`docker-compose.yml:91`), a least‑privilege login: `SELECT` only on `companies, clients, invoices, invoice_items, expenses`, **no** access to `users/sessions/activity_logs/team_memberships`, no write (`db/init/01-report-service-role.sh:24‑55`). Not a superuser.
- Superuser (`kontora`) capabilities relevant here: `COPY … TO/FROM PROGRAM` is usable **with no extension** → OS command exec; `pg_read_file()`, `pg_ls_dir()`, `lo_import()` are callable **inside a SELECT** (in‑band file read); `dblink`/`postgres_fdw` are almost certainly **not installed** by default, but a superuser could `CREATE EXTENSION` them. `report_readonly` can do **none** of these.

**Stacked / multi‑statement reachability**
- The sink uses `$queryRawUnsafe(string)` with **no bound parameters**, so Prisma forwards the raw text to the `pg` adapter. Prisma’s raw methods normally execute as a **single statement via the extended (prepared) protocol**, which **rejects `;`‑separated stacked statements**. **VERIFY before planning stacked‑query payloads** (`'; COPY … FROM PROGRAM …; --`). Consequence: **in‑band single‑statement** techniques (UNION / subquery / boolean / error / `pg_sleep` time‑based, plus superuser `pg_read_file` in a UNION) are the reliable fit; **`COPY … PROGRAM` RCE depends on stacked queries working through this sink** (flagged in §6). No code path anywhere uses `pg` simple‑query with a raw multi‑statement string.

---

## 2. Candidate injectable read features (list / search / filter / sort)

| # | Route (method) | UI page | User‑controllable params | Query & file | Param handling today | Returned shape (≈ cols) | Auth / role |
|---|---|---|---|---|---|---|---|
| **1** | **`GET /api/invoices/lookup?number=`** | none (API helper; invoices list uses #2) | **`number`** (query) | **raw** `SELECT id, number, status, total FROM invoices WHERE number = '${number}'` — `api/src/controllers/invoice.controller.ts:104`; routed `api/src/routes/invoice.routes.ts:34` | **INTERPOLATED — unvalidated, not tenant‑scoped** | `id, number, status, total` → **4 columns**, all text‑castable | `requireAuth` only (`routes/index.ts` mounts `/invoices` with `requireAuth`; the route has **no `requireRole`**) → **any authenticated role incl. `CLIENT_GUEST`** |
| 2 | `GET /api/invoices?status=&clientId=` | `/invoices` (invoices list) | `status`, `clientId` | `invoice.service.ts:87` `listInvoices` (Prisma `findMany`) via `invoice.controller.ts:16` | validated: `status` = enum, `clientId` = uuid (`validation/invoice.schemas.ts:41‑44`); Prisma **parameterized** | full invoice + client + items | `requireAuth`; row‑scoped (CLIENT_GUEST → own client only) |
| 3 | `GET /api/clients?search=` | `/clients` | `search` | `client.service.ts:14` Prisma `contains` | **parameterized** | client rows | `requireAuth` (OWNER/ACCOUNTANT/MEMBER) |
| 4 | `GET /api/expenses?category=` | `/expenses` | `category` | `expense.service.ts:21` Prisma equality | **parameterized** | expense rows | `requireAuth` (OWNER/ACCOUNTANT) |
| 5 | `GET /api/activity?limit=&offset=` | `/activity` | `limit`, `offset` (numeric) | `activity.service.ts:37` Prisma `take/skip` | validated numeric (`validation/activity.schemas.ts`); **parameterized** | activity rows + user | `requireAuth` (OWNER/ACCOUNTANT) |
| 6 | `POST /graphql` (`clients(search)`, `invoices(status,clientId)`, `client(id)`, `invoice(id)`, `expenses`) | GraphiQL (dev) | same params as above | `api/src/gql/resolvers.ts:61‑94` delegates to the same **parameterized** services | **parameterized** | typed objects | behind `requireAuth`; per‑resolver role checks |
| 7 | report‑service `POST /reports/named`, `POST /reports/revenue-summary` (via `GET /api/reports/named/:name`, `GET /api/reports/revenue-summary`) | `/reports` | report **name** (+ Ch12 `template`/`c`/`pref` passthrough) | PDO **prepared**, `:companyId` bound (`named_reports.php`, `reports.php`) | **parameterized** (the report *name* path is the separate LFI/RCE chapter, **not** SQLi) | report rows | `requireAuth` + OWNER/ACCOUNTANT (`routes/report.routes.ts`) |
| 8 | `GET /api/blog/posts`, `GET /api/blog/posts/:slug` | `/blog`, `/blog/[slug]` | `slug` | `blog.service.ts:37,46` Prisma | **parameterized** | published post fields | **unauthenticated** (`routes/blog.routes.ts:40‑41`) |

**Specifically called out**
- **ORDER BY / sort‑column:** **no endpoint currently exposes a user‑chosen sort column or direction** — every `orderBy` in the codebase is hard‑coded (`invoice.service.ts:104`, `client.service.ts:27`, `expense.service.ts:27`, `activity.service.ts:45`, etc.). This prime raw‑concat class has **no existing home**; a reviewer would add a `sort`/`order` param to a list endpoint to host it (see §6).
- **Numeric / id filters:** `clientId` (#2) and the GraphQL `id` args are `uuid`‑validated and Prisma‑parameterized. Invoice IDs are UUIDs. The only id‑ish value that reaches raw SQL is `number` in #1 (text).

---

## 3. Store‑then‑reuse flows (second‑order candidates)

**Write paths (free text a user persists):**
- **Client** `name / email / phone / billingAddress / notes` ← `POST/PATCH /api/clients` → `client.service.ts:52 createClient`, `:65 updateClient` → `clients` table.
- **Company** `name / description / address / website` ← `PATCH /api/company` → `company.service.ts` → `companies`.
- **Invoice** `notes` ← `POST/PATCH /api/invoices` → `invoice.service.ts` (create/update) → `invoices.notes`.
- **Expense** `category / description` (category is free text) ← `POST/PATCH /api/expenses` → `expense.service.ts:59,82` → `expenses`.
- **Blog** `title / excerpt / body` ← `POST/PATCH /api/blog/admin/posts` → `blog.service.ts` → `blog_posts`.

**Later read/consume paths (a *different* query re‑uses the stored value):**
- Client `name/email/phone` → **`client-directory`** named report — `services/report-service/src/named_reports.php:47‑54` (`SELECT name, email, phone … WHERE "companyId" = :companyId`). **Parameterized**; the name is only *SELECTed/returned*, never concatenated into SQL.
- Company `name` + client `name` → **`revenue-summary`** — `services/report-service/src/reports.php:11,56‑64` (JOIN `clients`, returns `client_name`, `company['name']`). **Parameterized**.
- Expense `category` → **`expense-summary`** `GROUP BY category` — `named_reports.php:38‑46`; and the list filter `expense.service.ts:21`. **Parameterized**.

**Assessment:** every store→reuse pair above re‑consumes the stored value through a **parameterized** statement or as *output only* — **there is no existing second‑order SQLi sink.** To host a second‑order variant the reviewer must introduce a raw/interpolated read that embeds one of these stored free‑text fields. Best fit: **`client.name` (or `client.notes` / `invoice.notes` / `company.name`)** — they are user‑settable and already flow into reporting, so interpolating one into a (new or modified) raw report query in `report-service` or a raw API list reads as a natural feature. **Not** a candidate: `invoice.number` (the field behind the §2 #1 sink) is **server‑generated** `INV‑####` (`invoice.service.ts generateInvoiceNumber`), so #1 is strictly first‑order.

---

## 4. Schema (tables, key columns, relationships) — `db/prisma/schema.prisma`

| Table (`@@map`) | Key columns | Relationships | Sensitive |
|---|---|---|---|
| `users` | id, **email** (unique), **passwordHash**, name | ← team_memberships, sessions, invoices(createdBy), blog_posts(author), … | **passwordHash**, email |
| `team_memberships` | id, **role** (OWNER/ACCOUNTANT/MEMBER/CLIENT_GUEST), userId, companyId, clientId | user, company, client | role gate; clientId scopes CLIENT_GUEST |
| `sessions` | id, userId, companyId, **refreshTokenHash** (unique), userAgent, ipAddress, expiresAt, revokedAt | user, company | **refreshTokenHash** |
| `password_reset_tokens` | id, userId, **tokenHash** (unique), expiresAt, usedAt | user | **tokenHash** |
| `webhooks` | id, companyId, url, **secret**, isActive, events[] | company, deliveries | **secret** (HMAC signing key) |
| `webhook_deliveries` | id, webhookId, event, **payload (Json)**, statusCode, success, errorMessage | webhook | payload may contain data |
| `companies` | id, name, slug (unique), website, address, description, logoUrl | clients, invoices, expenses, … | tenant root |
| `clients` | id, companyId, name, email, phone, billingAddress, notes | company, invoices | free‑text (2nd‑order source) |
| `invoices` | id, companyId, clientId, createdById, **number**, status, dates, subtotal/tax/total, notes | company, client, items, attachments | financial; `number` feeds §2 #1 |
| `invoice_items` | id, invoiceId, description, quantity, unitPrice, amount, position | invoice | — |
| `expenses` | id, companyId, category, description, amount, currency, date | company | — |
| `blog_posts` | id, companyId, authorId, title, slug (unique), excerpt, body, status, publishedAt | company, author | public‑facing |
| `invoice_attachments` | id, invoiceId, companyId, uploaderId, filename, storedName, mimeType, sizeBytes | invoice, company, uploader | file metadata |
| `activity_logs` | id, companyId, userId, action, entityType, entityId, **metadata (Json)** | company, user | audit; metadata may hold data |

**Auth/users live in `users` + `team_memberships` + `sessions` + `password_reset_tokens`.** Prime UNION/second‑order exfil targets: `users.passwordHash`, `users.email`, `sessions.refreshTokenHash`, `password_reset_tokens.tokenHash`, `webhooks.secret`. Note the §2 #1 sink runs as **`kontora` (superuser)**, so **all** of these are reachable via UNION from that sink — the `report_readonly` table restriction does **not** apply to the API path.

---

## 5. Auth & roles

- **Mechanism:** JWT access token in an httpOnly cookie `kontora_at` (short‑lived) + rotating opaque refresh `kontora_rt` scoped to `/api/auth` (`api/src/lib/cookies.ts`, `api/src/lib/jwt.ts`, `api/src/services/auth.service.ts`). `requireAuth` verifies the access token and populates `req.auth = { userId, companyId, role, sessionId }` (`api/src/middleware/requireAuth.ts`); `requireRole(...)` gates by `req.auth.role` (`api/src/middleware/requireRole.ts`). Also present: OAuth “Kontora ID” login and a WebSocket surface (not data‑backed for SQLi).
- **Roles:** `OWNER, ACCOUNTANT, MEMBER, CLIENT_GUEST`, held per‑tenant on `team_memberships` (`schema.prisma:21‑26,94‑111`). `companyId`/`role` always come from the signed token, never request params.
- **Gating:** feature routers are mounted with `requireAuth` in `api/src/routes/index.ts`; individual routes add `requireRole`. **Exception:** the blog router is mounted **without** global `requireAuth` and its public reads are open (`routes/blog.routes.ts:11‑16,40‑41`). GraphQL sits behind `requireAuth`.
- **Public / low‑priv, data‑backed surfaces:**
  - **Unauthenticated:** `GET /api/blog/posts`, `GET /api/blog/posts/:slug` (Prisma‑parameterized; no injectable input today). No public invoice/share links exist.
  - **Lowest authenticated role:** `CLIENT_GUEST` can reach the injectable **`GET /api/invoices/lookup`** because that route carries **no `requireRole`** — i.e. the existing SQLi is exploitable by the least‑privileged account that can log in (portal guest). It is also **not tenant‑scoped**, so it already crosses companies.

---

## 6. Recommendation — best existing home per variant

**Primary sink for in‑band + blind variants: `GET /api/invoices/lookup?number=` (`api/src/controllers/invoice.controller.ts:104`).** Single‑quoted string context, unvalidated, not tenant‑scoped, superuser role, CLIENT_GUEST‑reachable, returns a clean 4‑column SELECT.

- **UNION‑based →** ideal here. 4 text‑castable columns; e.g. break out with `'` then `UNION SELECT id::text, email, "passwordHash", name FROM users -- `. Superuser means `users/sessions/webhooks.secret` are all in reach. **Best home: this sink.**
- **Error‑based →** fits the same sink (Postgres cast/`to_number()`/`xmlparse` errors). Prereq: confirm the error body is returned to the client — check `api/src/middleware/errorHandler.ts` for message leakage; if it’s masked, error‑based is weaker and boolean/time should be preferred.
- **Boolean‑based blind →** fits the same sink (`' AND (SELECT …) --`), independent of output shape.
- **Time‑based blind →** fits the same sink; `pg_sleep()` works **inside a SELECT/subquery**, so **no stacked query needed** (`' AND (SELECT CASE WHEN (<cond>) THEN pg_sleep(5) ELSE pg_sleep(0) END) IS NOT NULL -- `). **Most robust choice** if error output is masked.
- **OOB (OAST) →** *poor fit for this sink.* Native Postgres has no generic DNS/HTTP primitive; superuser OOB realistically needs `COPY … TO PROGRAM` (curl/nslookup) or `dblink`/`postgres_fdw` to a collaborator — all of which need **stacked queries and/or an extension**. Flag: only viable if stacked queries are reachable (see §1) or an extension is created; otherwise **no current feature hosts OOB well**.
- **SQLi → RCE →** the API role **is a superuser**, so `COPY (…) TO PROGRAM 'cmd'` / `COPY t FROM PROGRAM 'cmd'` = RCE **in principle**. **Dependency:** it needs **stacked‑query execution**, which Prisma `$queryRawUnsafe` (extended protocol) likely blocks — **verify first**. Fallbacks: (a) single‑statement **file read** via `pg_read_file()`/`pg_ls_dir()`/`lo_import()` inside the UNION (disclosure, not exec) is available now; (b) if stacked queries prove unreachable through Prisma, the cleanest way to host a *real* SQLi→RCE is a **new raw sink that runs full statements** (e.g. an API endpoint using the `pg` client’s simple‑query, or a raw statement in report‑service — but note report‑service’s `report_readonly` is **not** superuser and SELECT‑only, so COPY‑PROGRAM won’t work there). **Recommend hosting SQLi→RCE on an API sink (superuser role) and confirming multi‑statement execution.**
- **Second‑order →** no existing sink (§3). **Best pair:** persist via `POST/PATCH /api/clients` (`client.service.ts` → `clients.name`/`notes`) or invoice `notes`, then consume by interpolating that stored field into a **new/modified raw report query** (report‑service `named_reports.php`/`reports.php`, which already read client/company names) or a raw API list. `client.name → report` is the most natural because the data already flows into reporting.

**Variants with no clean current home (build required):**
- **ORDER BY / sort‑column injection** — no endpoint exposes a user‑chosen sort column/direction today (all `orderBy` hard‑coded). Add a `sort`/`dir` query param to a list endpoint (invoices or clients) and concatenate it into a raw `ORDER BY` to host this class.
- **OOB and stacked‑query‑dependent RCE** — hinge on multi‑statement execution the current Prisma sink likely prevents; verify, or introduce a raw multi‑statement sink.

---

### Appendix — key file references
- Raw sink: `api/src/controllers/invoice.controller.ts:101‑108`; route `api/src/routes/invoice.routes.ts:34`.
- Prisma client + adapter: `db/src/index.ts:1,11‑16`; `api/src/lib/prisma.ts:1`; versions `db/package.json:21‑26`.
- Parameterized examples: `api/src/services/client.service.ts:14‑29`, `invoice.service.ts:87‑117`, `expense.service.ts:21‑29`, `activity.service.ts:37‑53`, `gql/resolvers.ts:49‑123`.
- PHP (parameterized) reports: `services/report-service/src/reports.php`, `named_reports.php:29‑54,151‑152`, `db.php`.
- DB roles / version: `docker-compose.yml:5,8,10,91,180`; `db/init/01-report-service-role.sh`.
- Schema: `db/prisma/schema.prisma`. Auth: `api/src/middleware/requireAuth.ts`, `requireRole.ts`, `lib/cookies.ts`, `lib/jwt.ts`. Public blog: `api/src/routes/blog.routes.ts:40‑41`, `api/src/services/blog.service.ts:37‑56`.

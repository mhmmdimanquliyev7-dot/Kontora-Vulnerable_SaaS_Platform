# Kontora

Kontora is a B2B SaaS invoicing and client-management platform. This repo is a
portfolio project built to production-quality standards.

This is chapter 1: a clean, working skeleton with no product features yet.

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
- Postgres: localhost:5432
- Redis: localhost:6379

### Option B — Run services locally

```bash
npm install

# copy env files
cp api/.env.example api/.env
cp db/.env.example db/.env
cp frontend/.env.example frontend/.env

# start just the datastores in Docker
docker compose up postgres redis

# generate the Prisma client
npm run db:generate

# run the API and frontend in separate terminals
npm run dev:api
npm run dev:frontend
```

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
| `npm run db:studio`    | Open Prisma Studio                  |

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

## Status

No product features yet — this chapter is scaffold only. Domain models,
auth, and the actual invoicing/client-management functionality land in
later chapters.

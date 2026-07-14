# Deploying Kontora

This document covers running Kontora in a production-style topology — a
single public entry point in front of the whole stack — and adding real
HTTPS for a domain. For local development, see the root
[README](README.md) instead; that setup (`docker-compose.yml` alone,
every service's port published to the host) is intentionally unchanged by
anything here.

## Topology

```
                         ┌──────────────────────────────────────┐
Internet ──▶ nginx :80 ──┤  /            → frontend:3000         │
                         │  /api/...     → api:4000               │
                         │  /uploads/... → api:4000 (static)      │
                         └──────────────────────────────────────┘
                                          │
                        ┌─────────────────┼──────────────────────┐
                        ▼                 ▼                      ▼
                   postgres:5432     redis:6379    mongo:27017, report-service:80,
                                                     export-worker:8080
```

- **Public / routed through nginx:** `/` (frontend), `/api/*` (the Express
  API), `/uploads/*` (company logos, served by the API outside the `/api`
  prefix).
- **Internal-only, never routed or published:** Postgres, Redis, MongoDB,
  report-service (PHP), export-worker (Java), and MailHog. All six are
  reachable only from other containers on the compose network —
  report-service and export-worker are only ever called by the `api`
  container, exactly as in dev, just without a host port mapping to fall
  back on. `api` doesn't even talk to MailHog in this topology — see the
  SMTP note below.
- nginx is the **only** service that publishes a port to the host
  (`NGINX_PORT`, default `80`).

See `nginx/conf.d/default.conf` for the actual routing rules.

## Running the production-style stack

```bash
cp .env.prod.example .env.prod
# fill in real secrets — see the comments in that file; never reuse
# .env.example's dev values

docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

`docker-compose.prod.yml` is an overlay on top of `docker-compose.yml`: it
adds the `nginx` service, removes every other service's host port mapping,
and switches the API and frontend build to production settings (see the
comments in that file for exactly what changes and why).
`--env-file .env.prod` replaces the implicit `.env` load entirely, so dev
and prod configuration never mix.

Migrations and seed data work the same way as in dev, just pointed at this
stack — see the README's [Seed data](README.md#seed-data) section, or run
directly:

```bash
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml run --rm migrate migrate deploy
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml run --rm migrate db seed
```

Once up, the whole app is at `http://localhost:${NGINX_PORT:-80}` (or your
real domain, once DNS + HTTPS are set up below) — there's no more
`:3000`/`:4000` split; the frontend and API are both behind the one nginx
port.

## Adding HTTPS for a real domain

Nothing below is wired up by default — no certs are generated or fetched
locally. Pick one of the two options once you have a real domain pointed
at the server (an A/AAAA record to its public IP) and ports 80/443 open.

### Option A — Caddy (simplest; recommended if you don't already know nginx+certbot)

Caddy obtains and renews Let's Encrypt certificates automatically, with no
separate certbot step or renewal cron to manage. Replace the `nginx`
service in `docker-compose.prod.yml` with:

```yaml
caddy:
  image: caddy:2-alpine
  restart: unless-stopped
  depends_on:
    api:
      condition: service_healthy
    frontend:
      condition: service_started
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile:ro
    - caddy_data:/data
    - caddy_config:/config
  ports:
    - "80:80"
    - "443:443"
```

(add `caddy_data:` and `caddy_config:` under the top-level `volumes:` key
— they hold the certificates so renewals survive a container restart)

and add a `Caddyfile` at the repo root:

```
kontora.example.com {
    handle /api/* {
        reverse_proxy api:4000
    }

    handle /uploads/* {
        reverse_proxy api:4000
    }

    handle {
        reverse_proxy frontend:3000
    }
}
```

Caddy sets `X-Forwarded-Proto` correctly by default, so the API's
`trust proxy` handling (see `api/src/lib/cookies.ts`) issues Secure
cookies with no further changes needed. That's the whole setup — Caddy
requests and renews the certificate on first boot once DNS resolves to the
box.

### Option B — nginx + certbot (Let's Encrypt)

Keep the `nginx` service and extend `nginx/conf.d/default.conf`:

1. Add an ACME HTTP-01 challenge location and a redirect to HTTPS for
   everything else:

   ```nginx
   server {
       listen 80;
       server_name kontora.example.com;

       location /.well-known/acme-challenge/ {
           root /var/www/certbot;
       }

       location / {
           return 301 https://$host$request_uri;
       }
   }
   ```

2. Add a certbot container to obtain the certificate, sharing a volume
   with nginx for the webroot challenge and another for the resulting
   certs:

   ```yaml
   certbot:
     image: certbot/certbot
     volumes:
       - certbot_webroot:/var/www/certbot
       - certbot_certs:/etc/letsencrypt
     entrypoint: certbot certonly --webroot -w /var/www/certbot
       -d kontora.example.com --email you@example.com --agree-tos --no-eff-email
   ```

   mount those same two volumes into `nginx` as well (`certbot_webroot` at
   `/var/www/certbot`, `certbot_certs` at `/etc/letsencrypt`), then run
   `docker compose run --rm certbot` once to obtain the initial
   certificate.

3. Add a second `server` block listening on 443 with the issued cert, and
   move the existing `location /api/`, `/uploads/`, `/` blocks into it:

   ```nginx
   server {
       listen 443 ssl;
       server_name kontora.example.com;

       ssl_certificate     /etc/letsencrypt/live/kontora.example.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/kontora.example.com/privkey.pem;

       # ... the same proxy_set_header / location blocks already in
       # nginx/conf.d/default.conf ...
   }
   ```

   and publish `443:443` on the `nginx` service alongside `80:80`.

4. Renewal: certbot certificates expire every 90 days. Run
   `docker compose run --rm certbot renew` on a schedule (cron, or a
   `certbot` sidecar container looping `certbot renew` + `sleep 12h`), and
   have nginx reload (`nginx -s reload`) afterward to pick up the renewed
   cert.

Either option: once HTTPS is live, `X-Forwarded-Proto: https` reaches the
API on every request, `req.secure` is `true`, and auth cookies are issued
`Secure` automatically — no application config change needed (see the
comment in `api/src/lib/cookies.ts`).

## What's different from local dev

- One port (`NGINX_PORT`, default `80`) instead of separate `:3000`
  (frontend) / `:4000` (api) / `:8090` / `:8091` / `:5433` / `:27017` /
  `:6379` ports — everything else is internal-only.
- The frontend is built with `NEXT_PUBLIC_API_URL=""` (empty), so it calls
  the API at the same origin the page loaded from, not a hard-coded
  `localhost:4000`. This is fixed in `docker-compose.prod.yml`'s build
  args, not something you configure per deployment.
- `api` runs with `NODE_ENV=production`: `trust proxy` is enabled and
  auth cookies are issued `Secure` based on the actual inbound scheme
  (see above) rather than always non-Secure as in dev.
- Config comes from `.env.prod` (via `--env-file`), never `.env` — the two
  are never loaded together.
- Password reset emails go through a real SMTP provider (`SMTP_HOST` /
  `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `MAIL_FROM` in
  `.env.prod`), not MailHog — `docker-compose.prod.yml` overrides the
  dev-only `mailhog:1025` default and fails fast at startup if these
  aren't set. MailHog itself still runs (it's part of the base compose
  file) but is no longer published to the host, so its web UI isn't
  reachable — nothing in production should be sending mail through it
  anyway.

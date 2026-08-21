# Container Pilot Telemetry Tracker

An independently deployable Node.js 24 and PostgreSQL 16 service for Container Pilot's optional anonymous statistics. It is not part of the Container Pilot runtime image.

## Architecture

The tracker opens two independent listeners: public ingest on port `3090` and the authenticated internal dashboard on `3091`. The public listener implements only `POST /api/v1/telemetry`, `DELETE /api/v1/telemetry/:installation_id`, and `GET /healthz`; dashboard and statistics routes do not exist there. PostgreSQL has no published host port.

## Installation and secrets

```bash
mkdir -p secrets
openssl rand -base64 36 > secrets/admin_password
openssl rand -base64 36 > secrets/postgres_password
cp .env.example .env
chmod 600 secrets/* .env
docker compose up -d --build
```

Secrets and `.env` are excluded from Git and the Docker build context. Never place passwords in Compose. The dashboard defaults to `127.0.0.1:3091`. For a private management LAN, set `TRACKER_DASHBOARD_HOST` to the host's private address and restrict it with a firewall. Set `TRACKER_SECURE_COOKIE=true` when the dashboard uses internal HTTPS.

## Database, retention, and migrations

Versioned SQL migrations are transactional and recorded in `schema_migrations`. Each accepted payload stores one historical report and upserts one installation summary. Cumulative counters replace previous summary values; report-to-report differences supply update time-series values and are never double-counted. Raw reports are retained for 90 days by default and cleaned every six hours; configure `TRACKER_RETENTION_DAYS` as needed.

## Public reverse proxy

Only port 3090 belongs behind `cp-track.noisens.de`. Never proxy port 3091 on the public virtual host.

nginx:

```nginx
server {
  listen 443 ssl;
  server_name cp-track.noisens.de;
  location = /healthz { proxy_pass http://127.0.0.1:3090; }
  location = /api/v1/telemetry { limit_except POST { deny all; } proxy_pass http://127.0.0.1:3090; }
  location ~ ^/api/v1/telemetry/[0-9a-f-]+$ { limit_except DELETE { deny all; } proxy_pass http://127.0.0.1:3090; }
  location / { return 404; }
}
```

Caddy:

```caddy
cp-track.noisens.de {
  @ingest method POST
  @ingest path /api/v1/telemetry
  @delete method DELETE
  @delete path_regexp delete ^/api/v1/telemetry/[0-9a-f-]+$
  @health method GET
  @health path /healthz
  handle @ingest { reverse_proxy 127.0.0.1:3090 }
  handle @delete { reverse_proxy 127.0.0.1:3090 }
  handle @health { reverse_proxy 127.0.0.1:3090 }
  respond 404
}
```

## API and security

Payloads are limited to 16 KiB and validated against an exact, bounded schema; unknown fields are rejected. Rate limits allow ten reports per installation per hour plus a short-lived in-memory address limit. Remote addresses are neither logged nor persisted. Full payloads and full installation IDs are not logged.

Deletion requires `Authorization: Bearer <delete_token>`. The token is hashed and compared with the stored SHA-256 hash using a prepared query. Cascading foreign keys remove all reports.

The internal dashboard requires login and uses rate limiting, expiring server-side sessions, `HttpOnly`/`SameSite=Strict` cookies, optional `Secure`, origin and CSRF checks, security headers, and local assets only. It shows active installations (24h/7d/30d), versions, architectures, Docker versions, operating systems, container aggregates, feature/registry adoption, update/rollback counters, 7/30/90-day time series, an installation list, details, and report history.

## Backup, update, and troubleshooting

```bash
docker compose exec -T postgres pg_dump -U tracker -d container_pilot -Fc > container-pilot-telemetry.dump
```

Protect and test backups. Restore into an empty database with `pg_restore -U tracker -d container_pilot --clean --if-exists`. Before updates, back up PostgreSQL, pull changes, review migrations and `.env.example`, then run `docker compose build --pull tracker` and `docker compose up -d`.

- `GET /healthz` is healthy only when PostgreSQL responds.
- Verify `https://cp-track.noisens.de/dashboard` and `/api/dashboard/summary` return 404.
- Verify PostgreSQL has no host mapping and dashboard port 3091 is only locally or privately reachable.
- For login errors, check the mounted password file; rate limiting clears after 15 minutes.
- For rejected reports, check schema compatibility, body size, and rate limits without logging request bodies.

# Installation

[Documentation index](../README.md) · [Deutsch](../README.de.md)

## Requirements

- Docker Engine with Docker Compose
- outbound HTTPS access to GHCR and the registries used by managed containers
- a trusted internal network, VPN, or HTTPS reverse proxy

## Install without cloning the repository

```bash
mkdir container-pilot && cd container-pilot
mkdir -p secrets
openssl rand -base64 32 > secrets/admin_password
chmod 600 secrets/admin_password
curl -fsSLO https://raw.githubusercontent.com/DeepZone/container-pilot/main/compose.yml
docker compose pull
docker compose up -d
```

Open `http://YOUR-DOCKER-HOST:3080` and sign in as `admin` with the generated password. Change it after the first login.

## Bind to localhost

For a reverse proxy running on the Docker host:

```bash
CP_BIND_ADDRESS=127.0.0.1 docker compose up -d
```

Set `CP_SECURE_COOKIE=true` in `compose.yml` when the external URL uses HTTPS.

## Upgrade

Use **System update** in the Web UI for published releases. The helper container keeps the existing container until the replacement passes its healthcheck.

For a manual upgrade:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

Do not delete the `container-pilot-data` volume during upgrades.

## Uninstall

```bash
docker compose down
```

This keeps the data volume. Deleting the volume permanently removes users, policies, history, and settings and is intentionally not part of the normal uninstall command.

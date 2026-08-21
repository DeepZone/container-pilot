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

For direct HTTPS without a reverse proxy, provide certificate files and add the supplied override:

```bash
docker compose -f compose.yml -f compose.https.yml up -d
```

Then open `https://YOUR-DOCKER-HOST:3080`. See [HTTPS and reverse proxy](reverse-proxy.md) for certificate requirements and a localhost test certificate.

The Compose file defaults to the current release candidate until the first stable release exists. To select an explicit published image without editing the file:

```bash
CP_IMAGE=ghcr.io/deepzone/container-pilot:0.9.0-rc.9 docker compose up -d
```

After a stable release is published, select the stable channel with `CP_IMAGE=ghcr.io/deepzone/container-pilot:latest` and `CP_SELF_UPDATE_CHANNEL=stable`. The `latest` tag is never published for a release candidate.

## Bind to localhost

For a reverse proxy running on the Docker host:

```bash
CP_BIND_ADDRESS=127.0.0.1 docker compose up -d
```

Set `CP_SECURE_COOKIE=true` in `compose.yml` when the external URL uses HTTPS. Native HTTPS does this automatically through `compose.https.yml`.

## Upgrade

Use **System update** in the Web UI for published releases. The helper container keeps the existing container until the replacement passes its healthcheck.

For a manual upgrade:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

Do not delete the `container-pilot-data` volume during upgrades.

## Local development build

The production Compose file always references a published image. Developers can add the local build override:

```bash
docker compose -f compose.yml -f compose.dev.yml up --build
```

The `edge` image published from `main` is intended for testing only. Prefer an immutable `sha-*` tag when reporting or reproducing a development-build problem.

## Uninstall

```bash
docker compose down
```

This keeps the data volume. Deleting the volume permanently removes users, policies, history, and settings and is intentionally not part of the normal uninstall command.

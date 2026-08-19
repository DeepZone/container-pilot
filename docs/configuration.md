# Configuration

[Documentation index](../README.md)

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `TZ` | `Europe/Berlin` | Container timezone |
| `CP_PORT` | `8080` | Internal HTTP port |
| `CP_ADMIN_USER` | `admin` | Initial administrator username |
| `CP_ADMIN_PASSWORD_FILE` | `/run/secrets/admin_password` | Initial password secret file |
| `CP_SCAN_INTERVAL_MINUTES` | `60` | Initial scan interval |
| `CP_AUTO_DEFAULT` | `false` | Default automatic-update policy for new containers |
| `CP_HEALTH_TIMEOUT_SECONDS` | `120` | Maximum healthcheck wait |
| `CP_STARTUP_GRACE_SECONDS` | `5` | Stability window without a healthcheck |
| `CP_SECURE_COOKIE` | `false` | Adds the Secure attribute to session cookies |
| `CP_STORE_FILE` | `/data/state.json` | Persistent state path |
| `DOCKER_SOCKET` | `/var/run/docker.sock` | Docker API socket |
| `CP_SELF_UPDATE_REPOSITORY` | `DeepZone/container-pilot` | GitHub release source |
| `CP_SELF_UPDATE_IMAGE` | `ghcr.io/deepzone/container-pilot` | Release image repository |
| `CP_SELF_UPDATE_CHANNEL` | `stable` | `stable` or `prerelease` |

Settings changed in the Web UI are persisted in `/data/state.json` and take precedence over initial scheduling defaults.

## Roles

- `admin`: scans, updates, rollbacks, policies, settings, and user management
- `viewer`: read-only access to status and event history

## Per-container policy

Automatic installation requires both global automatic installation and the individual container policy. Automatic updates retain the configured tag and never switch a container to `latest`.

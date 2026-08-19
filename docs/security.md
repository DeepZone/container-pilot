# Security model

[Documentation index](../README.md) · [Security policy](../SECURITY.md)

## Docker socket

Container Pilot requires write access to `/var/run/docker.sock` to recreate containers. Docker socket access is effectively privileged host access. Compromising an administrator account or the application can therefore compromise the Docker host.

- Never expose the Web UI directly to the public Internet.
- Prefer a VPN or trusted management network.
- Use an HTTPS reverse proxy and set `CP_SECURE_COOKIE=true`.
- Restrict port `3080` with host and network firewalls.
- Keep Container Pilot and the Docker host updated.

## Authentication controls

- Passwords are stored as salted scrypt hashes.
- Sessions use HTTP-only, SameSite cookies.
- State-changing API requests require a matching CSRF token and same-origin request.
- Login attempts are rate limited.
- Viewer accounts cannot execute administrative actions.

## Secrets and diagnostics

The initial password is read through a Docker secret. Never commit the `secrets/` directory, `/data/state.json`, registry credentials, debug dumps, or unredacted production logs.

## Rollback boundary

Rollback restores a container image and container configuration. It does not restore database schemas, volumes, bind-mounted files, or external services. Use application-aware backups for stateful workloads.

# Troubleshooting

[Documentation index](../README.md)

## Login returns to the login page

- Use the current application URL consistently; changing hostnames can invalidate same-origin assumptions.
- Enable `CP_SECURE_COOKIE=true` only when accessing the external URL through HTTPS.
- Confirm the browser accepts cookies.
- Changing your own password intentionally ends existing sessions.

## An update remains visible

Run a fresh scan after an update. Compare the container's configured tag with its Compose source and verify that the registry is reachable.

## Replacement fails

Inspect the event history and container logs. Common causes include incompatible image variants, changed entrypoints, healthcheck failures, port conflicts, and irreversible application migrations.

## Rollback image cannot be discarded

Another running or stopped container still references that exact image. Identify that dependency before deleting anything.

## Information for a bug report

Include:

- Container Pilot version and Docker Engine version
- image reference with private registry names redacted
- container state and whether a healthcheck exists
- relevant, redacted event message
- minimal reproduction steps

Never include passwords, cookies, tokens, internal addresses, full state files, or unredacted environment variables.

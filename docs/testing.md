# Release-candidate testing

[Documentation index](../README.md) · [Troubleshooting](troubleshooting.md) · [Security](security.md)

Test release candidates on non-critical workloads first. Back up stateful applications and keep their original Compose definitions available.

## Test matrix

Record the original image, container state, expected result, actual result, event-history entry, and rollback outcome for each case.

| Scenario | Expected result |
| --- | --- |
| Running container without a healthcheck | Replacement remains running for the configured startup grace period |
| Healthy healthcheck | Replacement becomes healthy and old container is removed |
| Unhealthy healthcheck | Replacement is removed and old container is restored |
| Healthcheck timeout | Old container is restored after the configured timeout |
| Replacement exits during startup | Old container is restored |
| Named volume | Same volume is attached at the same target |
| Bind mount | Same host path, target, mode, and propagation are retained |
| Multiple networks | Endpoints and aliases are retained |
| Published ports | Bind addresses and host/container ports are retained |
| Environment variables | Runtime environment is retained without exposing values in reports |
| Restart policy | Runtime restart policy is retained |
| Stopped container | Replacement remains stopped |
| Fixed tag | Update stays on that tag |
| Optional switch to `latest` | Requires explicit confirmation and creates a rollback point |
| Successful manual rollback | Previous image is restored and the result is recorded in event history |
| Failed manual rollback | Error is visible and current container remains identifiable |
| Rollback disposal | Rollback action disappears and the unused retained image is removed only after confirmation |
| Viewer account | Can inspect status but cannot mutate policies, users, or containers |
| Concurrent actions | Second action for the same container is rejected |
| Linux AMD64 host | Image starts and the complete update workflow succeeds |
| Linux ARM64 host | Image starts and the complete update workflow succeeds |
| Private registry | Credential secret is used without exposing registry details in events or reports |
| Watchtower migration | Supported labels are previewed and only confirmed policies are imported |
| Container Pilot self-update | Helper validates the replacement and reports a clear final result |
| Self-update failure | Previous Container Pilot image is restored |
| HTTPS reverse proxy | Login, sessions, and mutations work with secure cookies enabled |
| Native HTTPS | UI and health endpoint are served with the configured certificate |

## Reproducible update fixtures

The repository's Docker integration test creates isolated fixture images, a network, and a volume. It verifies configuration reconstruction and forces an unhealthy replacement to exercise automatic restoration:

```bash
npm run test:integration
```

Run the test only on a disposable Docker host. The fixture uses names prefixed for Container Pilot tests and removes them during cleanup.

## Feedback and debug information

Use the **Release candidate feedback** issue form. Include:

- Container Pilot version and image tag
- Docker Engine and Compose versions
- host architecture and operating system
- anonymized source image form such as `registry.example/team/app:1.2`
- whether the container was running and whether it had a healthcheck
- the action, expected result, actual result, and exact timestamp
- relevant event types and sanitized error messages

Never include passwords, registry tokens, cookies, CSRF tokens, environment-variable values, private image names, private registry URLs, internal hostnames or IP addresses, mount paths, full environment dumps, full state files, or unredacted Docker inspection output.

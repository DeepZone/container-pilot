# Migrate from Watchtower

[Documentation index](../README.md) · [Updates](updates.md) · [Rollback](rollback.md)

The original Watchtower repository was [archived by its owner on 17 December 2025](https://github.com/containrrr/watchtower) and describes itself as no longer maintained. Container Pilot is not a drop-in replacement: it emphasizes visible decisions, validation, and recovery.

## Before you start

1. Back up application data and databases. An image rollback cannot reverse a schema or volume change.
2. Record Watchtower's arguments, environment variables, selected container names, and labels.
3. Disable automatic updates for stateful or critical services until each update path has been tested.
4. Keep the Compose files that define your applications authoritative.

## Migration

Stop Watchtower without deleting application containers or volumes:

```bash
docker stop watchtower
docker rename watchtower watchtower-disabled
```

Install Container Pilot using the [installation guide](installation.md), sign in, and run **Scan now**. Review every detected container before enabling its automatic-update policy.

Container Pilot recognizes these Watchtower labels for an optional import preview:

- `com.centurylinklabs.watchtower.enable=true` proposes automatic updates.
- `com.centurylinklabs.watchtower.enable=false` proposes keeping automatic updates disabled.
- `com.centurylinklabs.watchtower.monitor-only=true` proposes keeping automatic updates disabled.

This mapping follows Watchtower's official [container-selection documentation](https://github.com/containrrr/watchtower/blob/main/docs/container-selection.md). A preview never changes policies. An administrator must confirm the import, and every imported rule is written to the event history.

Other Watchtower options are intentionally not imported. Scheduling, cleanup, scopes, lifecycle hooks, registry credentials, notifications, and command-line container filters do not map safely to a per-container boolean policy.

## Validate the new setup

1. Leave global automatic installation disabled.
2. Scan and inspect the update result for each image.
3. Test a disposable stateless container manually.
4. Confirm that its healthcheck or startup observation succeeds.
5. Confirm the rollback point appears, then test or deliberately discard it.
6. Only then enable automatic installation globally and per container.

When the new setup has operated successfully for an appropriate observation period, remove the stopped Watchtower container:

```bash
docker rm watchtower-disabled
```

Do not run Watchtower and Container Pilot with automatic updates enabled for the same containers. Concurrent replacement attempts can conflict.

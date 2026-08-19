# Container Pilot and WUD

[Documentation index](../README.md)

[WUD (What's up Docker?)](https://github.com/getwud/wud) is an active and capable project. This page describes different design priorities based on its official documentation as checked in August 2026; it is not a claim that Container Pilot has more features.

| Area | WUD | Container Pilot |
| --- | --- | --- |
| Core model | Watchers discover containers, registries resolve versions, triggers notify or act | One focused detect, decide, update, verify, recover workflow |
| Web UI | Container insights and manual trigger execution | Container status, policy, update, rollback, events, and users |
| Registry breadth | Broad built-in registry provider list, including public, private, cloud, and self-hosted registries | Docker Hub, GHCR, and generic OCI registry support with a smaller credential model |
| Update execution | Trigger-based; the Docker Compose trigger can edit a Compose file and replace containers | Directly reconstructs a container from Docker runtime configuration |
| Notifications/integrations | Many trigger providers | Generic webhook foundation |
| Compose ownership | Docker Compose trigger can update a mounted Compose source | Never edits external Compose files |
| Recovery focus | Consult the selected trigger's behavior and backup options | Retains the previous image digest and automatically restores the prior container after failed validation |
| Scope | Extensible watcher/registry/trigger platform | Deliberately narrow Docker update manager |

Sources: [WUD overview](https://getwud.github.io/wud/), [official repository](https://github.com/getwud/wud), [trigger documentation](https://github.com/getwud/wud/blob/main/docs/configuration/triggers/README.md), and [Docker Compose trigger](https://github.com/getwud/wud/blob/main/docs/configuration/triggers/docker-compose/README.md).

## Practical distinction

Choose WUD when registry breadth, trigger integrations, and Compose-file mutation fit your operating model. Consider Container Pilot when the central requirement is a compact authenticated workflow with health validation and an immediately visible image rollback point.

Container Pilot focuses on controlled, visible, and recoverable Docker updates. It does not try to reproduce WUD's provider ecosystem.

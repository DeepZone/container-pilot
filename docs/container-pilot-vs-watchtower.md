# Container Pilot and Watchtower

[Documentation index](../README.md) · [Migration guide](migrate-from-watchtower.md)

This comparison is intended to help operators choose a workflow, not to diminish Watchtower. It was checked against the archived upstream documentation in August 2026.

| Area | Watchtower | Container Pilot |
| --- | --- | --- |
| Project status | Original repository archived and read-only since 17 December 2025 | Active release-candidate project |
| Primary workflow | Periodically detect and replace selected containers | Detect, decide, update, validate, recover |
| Web interface | No built-in management Web UI documented | Built-in Web UI |
| Manual execution | Run-once mode and HTTP API mode | Per-container action in the Web UI |
| Per-container selection | Names, scopes, and labels | Stored per-container automatic-update policy |
| Monitor without updating | Global option and per-container label | Scan globally while automatic installation is disabled globally or per container |
| Scheduling | Poll interval or cron expression | Configurable interval in minutes |
| Health behavior | Lifecycle hooks are available; no built-in health-gated image rollback is documented | Docker healthcheck/startup observation gates replacement; failed updates restore the previous container |
| Manual rollback | No built-in retained rollback action documented | Previous image digest retained until rollback or explicit discard |
| Notifications | Multiple notification backends | Generic webhook foundation |
| User roles | No built-in Web UI accounts | Administrator and read-only viewer |
| Compose source files | Recreates from runtime container configuration | Recreates from runtime container configuration; does not edit external Compose files |

Sources: [Watchtower repository status and overview](https://github.com/containrrr/watchtower), [arguments](https://github.com/containrrr/watchtower/blob/main/docs/arguments.md), and [container selection](https://github.com/containrrr/watchtower/blob/main/docs/container-selection.md).

## Choose based on operating style

Watchtower's archived code remains useful to understand established label-driven automation. Container Pilot is aimed at operators who want an authenticated interface, an explicit decision per container, visible event history, health-gated replacement, and an image-level recovery point.

Neither tool backs up databases or volume data. Neither should be treated as a substitute for application-aware backup and restore procedures.

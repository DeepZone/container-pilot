# Roadmap

The roadmap is directional, not a release guarantee. Container Pilot remains focused on **Detect, Decide, Update, Verify, Recover**.

## v1.0

- stable update engine and container reconstruction
- healthcheck validation and automatic recovery
- manual rollback and rollback disposal
- Web UI, event history, and per-container policies
- administrator and viewer roles
- public multi-architecture GHCR images
- English and German documentation

### Release readiness: real-world validation

v1.0 is gated primarily by real-world validation rather than additional feature scope. Before declaring it stable, release-candidate testing should cover:

- external release-candidate testing on real Docker hosts
- real Linux AMD64 field validation
- real Linux ARM64 field validation
- containers with and without Docker healthchecks
- named volumes, bind mounts, published ports, and multiple networks
- public and private registries
- fixed-tag updates and explicit switches to `latest`
- Watchtower policy migration
- Container Pilot self-update and recovery
- automatic recovery, manual rollback, and rollback disposal
- reverse proxies and native HTTPS
- small and larger mixed-container installations
- no open critical reliability bugs
- no open critical security issues

## v1.1

- ntfy and Gotify integrations
- additional notification adapters

## v1.2

- additional cloud-specific registry credential helpers

## Future

- additional registries
- maintenance windows and advanced scheduling
- pre-update, backup, and post-update hooks
- documented external API
- additional integrations that directly support the update lifecycle

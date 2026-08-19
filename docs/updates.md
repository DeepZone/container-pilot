# Update behavior

[Documentation index](../README.md) · [Rollback](rollback.md)

## Detection

Container Pilot compares the local image digest with the manifest digest for the configured tag. It reports Docker image updates; it does not independently compare application versions inside arbitrary images.

## Manual and automatic updates

- A manual update replaces the image behind the current tag.
- A confirmed `latest` switch changes the configured image reference and may cross major versions.
- Automatic updates always retain the existing tag.
- Per-container locks prevent concurrent update or rollback operations.

## Replacement sequence

1. Pull the target image.
2. Preserve the current digest as a rollback point.
3. Stop and rename the current container.
4. Recreate it with preserved Docker configuration.
5. Start and validate the replacement.
6. Remove the old container only after successful validation.

Container Pilot preserves ports, environment, restart policy, labels, mounts, hostname, and network attachments. It rejects unsafe `AutoRemove` containers and `container:…` network mode.

## Compose drift

Container Pilot cannot edit the external Compose source that created a container. Update that source after an intentional tag change, otherwise a later `docker compose up` can restore the old reference.

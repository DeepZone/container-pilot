# Rollback

[Documentation index](../README.md) · [Updates](updates.md)

## Automatic recovery

The previous container is kept until the replacement becomes ready. A failed start, unhealthy result, restart loop, or healthcheck timeout removes the replacement and restores the previous container.

## Manual rollback

After a successful update, the Web UI offers one rollback to the exact previous image digest. A successful rollback consumes that rollback point.

When the new version has been operating safely, **Discard rollback** removes the rollback point and attempts to remove the old image. Deletion is refused when another running or stopped container still uses that image.

## Data warning

Image rollback does not undo migrations or restore data. The old application can be incompatible with data already changed by the new version. Back up stateful applications before updating them.

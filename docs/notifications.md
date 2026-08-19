# Webhook notifications

[Documentation index](../README.md) · [Configuration](configuration.md) · [Security](security.md)

Container Pilot can send a small JSON document to one generic webhook endpoint for these lifecycle events:

- `update-available`
- `update-started`
- `update-successful`
- `update-failed`
- `healthcheck-failed`
- `rollback-started`
- `rollback-successful`
- `rollback-failed`

Enable the webhook and enter its URL under **Automation**. HTTPS is required by default. The payload contains the Container Pilot version, event type and time, container, image, result, and message. It deliberately excludes usernames, session data, CSRF values, registry credentials, and complete container configuration.

## Optional bearer token

Create `secrets/webhook_token`, then use the provided override:

```bash
docker compose -f compose.yml -f compose.integrations.example.yml up -d
```

The token is read from `CP_WEBHOOK_TOKEN_FILE` and sent as an `Authorization: Bearer` header. It is never returned by the API or written to the state file.

For a trusted HTTP-only development receiver, set `CP_ALLOW_INSECURE_WEBHOOK=true`. Do not use that option across untrusted networks. Administrators control the destination URL, so treat webhook configuration as privileged host-level configuration.

Delivery has a ten-second timeout and does not block or reverse the Docker operation. A failed notification is logged without including the token.

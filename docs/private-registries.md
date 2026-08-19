# Private registries

[Documentation index](../README.md) · [Configuration](configuration.md) · [Security](security.md)

Container Pilot supports authenticated Docker Hub, GHCR, GitLab Container Registry, and generic OCI Registry v2 endpoints. Credentials are read from a Docker Secret file and are not stored in `/data/state.json` or exposed through the Web UI.

## Credential secret

Create `secrets/registry_credentials.json` with mode `0600`:

```json
{
  "docker.io": {
    "username": "docker-user",
    "password": "access-token"
  },
  "ghcr.io": {
    "username": "github-user",
    "token": "read-packages-token"
  },
  "registry.example.com": {
    "username": "registry-user",
    "password": "pull-token"
  }
}
```

Use a read-only pull token whenever the registry supports scoped tokens. Then add the integrations override:

```bash
chmod 600 secrets/registry_credentials.json
docker compose -f compose.yml -f compose.integrations.example.yml up -d
```

The registry hostname must exactly match the hostname in the image reference. Docker Hub uses `docker.io`. Container Pilot supports Basic authentication and the standard OCI Bearer challenge flow, and passes the same secret to Docker Engine when pulling an image.

## Security notes

- Never put credentials directly in `compose.yml`, labels, issue reports, or screenshots.
- The JSON secret is plaintext at rest on the host; protect it with filesystem permissions and host-level encryption.
- Rotate tokens independently of Container Pilot by replacing the secret file and restarting the application.
- Private image names and registry hostnames may appear in the authenticated interface and event history; sanitize them before sharing debug output.
- Custom certificate authorities are not managed by Container Pilot. Configure registry trust in Docker Engine and the host runtime.

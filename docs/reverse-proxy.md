# Reverse proxy

[Documentation index](../README.md) · [Security](security.md)

Bind Container Pilot to localhost when the proxy runs on the Docker host:

```bash
CP_BIND_ADDRESS=127.0.0.1 docker compose up -d
```

Set this environment value in the Container Pilot service:

```yaml
environment:
  CP_SECURE_COOKIE: "true"
```

Proxy HTTPS traffic to `http://127.0.0.1:3080`. Preserve the original `Host` header and forward the client protocol. Container Pilot does not require WebSockets.

Example nginx location:

```nginx
location / {
    proxy_pass http://127.0.0.1:3080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Authentication at the reverse proxy may be used as an additional layer, but it does not replace Container Pilot's own user management.

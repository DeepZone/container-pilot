# HTTPS and reverse proxy

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

## Native HTTPS

Container Pilot can terminate TLS itself when a reverse proxy is not available. Place a PEM certificate or full chain and its matching private key in the local `secrets` directory:

```text
secrets/tls.crt
secrets/tls.key
```

Start the regular stack together with the HTTPS override:

```bash
docker compose -f compose.yml -f compose.https.yml up -d
```

The existing published port then serves HTTPS instead of HTTP:

```text
https://YOUR-DOCKER-HOST:3080
```

The override mounts both files as Docker Secrets and enables `CP_TLS_CERT_FILE`, `CP_TLS_KEY_FILE`, and secure session cookies. The certificate must contain the hostname or IP address used by the browser. Use a certificate from a trusted internal or public CA for regular operation.

For a short localhost test, create a self-signed certificate:

```bash
openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days 30 \
  -keyout secrets/tls.key -out secrets/tls.crt \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
chmod 600 secrets/tls.key
```

Browsers will warn about this self-signed test certificate. Never commit certificate private keys. If the private key is encrypted, mount a third secret and set `CP_TLS_KEY_PASSPHRASE_FILE` to its in-container path.

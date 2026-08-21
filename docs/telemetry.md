# Anonymous usage statistics

Container Pilot telemetry is optional, transparent, and disabled by default. It starts only after an administrator explicitly enables **Anonymous Usage Statistics** in the web interface. Existing state files are migrated with telemetry switched off.

## Data sent

When enabled, Container Pilot sends schema version 1 to `POST https://cp-track.noisens.de/api/v1/telemetry` at most once every 24 hours. Startup uses a random delay of two to fifteen minutes. The endpoint can be overridden with `CP_TELEMETRY_URL`; production endpoints must use HTTPS, while HTTP is accepted only for localhost tests.

The report contains:

- a random UUID v4 installation ID and a SHA-256 hash of a random deletion token;
- Container Pilot version and release channel;
- normalized architecture, Docker/API version, general OS name, and kernel major/minor;
- aggregate container counts: total, running, stopped, healthcheck, and automatic-update policy counts;
- Boolean feature adoption for Watchtower migration, native HTTPS, private registry configuration, and webhooks;
- Boolean registry categories: Docker Hub, GHCR, GitLab, and generic OCI;
- cumulative successful/failed update and automatic/manual rollback counters.

The raw delete token remains only in local Container Pilot state. The receiving service stores only its SHA-256 hash. Counters are cumulative and the latest values replace earlier cumulative values instead of being added repeatedly.

## Data never sent

Container Pilot does not send hostnames, Docker host names, IP or MAC addresses, machine IDs, hardware serials, container names or IDs, images, tags, digests, repository names, registry domains or URLs, labels, Compose metadata, networks, volumes, mounts, paths, ports, environment variables, usernames, passwords, tokens, secrets, certificates, keys, browser information, application data, or file contents.

The receiving service stores only the telemetry fields documented above. Remote IP addresses are not persisted and complete request payloads are not written to application logs.

Collected telemetry statistics are used internally for project development and are not publicly accessible. The centrally operated receiving service is not part of the public Container Pilot source repository.

## Controls and transparency

The telemetry dialog shows enabled state, shortened installation ID, last successful report, last attempt, safe status, and next scheduled report. **Preview data** builds the live payload with the exact same function used by **Send now**; it contains no example or hidden fields.

Disabling telemetry stops future requests without deleting local counters. **Reset telemetry identity** removes the local installation ID, delete token, timestamps, and status. Enabling telemetry again creates a new cryptographically random identity. **Delete server data** authenticates to the public deletion endpoint with the local delete token, deletes the installation and all reports, and then resets the local identity.

## Failure behavior

Telemetry has an eight-second timeout and is fail-open. DNS, connection, timeout, TLS, HTTP, rate-limit, invalid-response, and receiving-service errors are reduced to a non-sensitive local status. They never stop or delay scans, updates, rollbacks, UI actions, or the Container Pilot process.

Privacy principles: opt-in instead of opt-out, transparent instead of hidden, aggregated instead of detailed, and minimal instead of curious.

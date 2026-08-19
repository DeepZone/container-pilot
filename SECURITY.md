# Security Policy

## Reporting a vulnerability

Do not disclose suspected vulnerabilities publicly before a fix is available. Use GitHub's private vulnerability reporting feature for this repository when available. If it is unavailable, open a minimal issue asking the maintainers for a private contact channel without including exploit details.

Never include passwords, session cookies, API tokens, registry credentials, internal addresses, private image names, complete state files, or unredacted logs in a public report.

Please provide privately:

- affected Container Pilot version
- concise impact description
- reproducible steps or proof of concept
- required privileges and deployment assumptions
- suggested mitigation, if known

## Trust boundary

Container Pilot has write access to the Docker API. Administrator access to Container Pilot must therefore be treated as privileged access to the Docker host. Deploy it only in a trusted management network, through a VPN, or behind an HTTPS reverse proxy with appropriate network restrictions.

## Supported versions

During the release-candidate phase, security fixes are provided for the latest published release candidate only.

## Response expectations

Maintainers will acknowledge a complete private report when operationally possible, assess severity, and coordinate disclosure after a fix or mitigation is available. This is a community project and does not currently offer a contractual response-time guarantee.

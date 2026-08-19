# Contributing to Container Pilot

Thank you for helping improve controlled Docker updates.

## Before opening an issue

- Search existing issues and the [troubleshooting guide](docs/troubleshooting.md).
- Remove credentials, internal addresses, private image names, and personal data.
- Use a minimal reproducible example whenever possible.
- Report vulnerabilities according to [SECURITY.md](SECURITY.md), not in a public bug report.

## Development

Requirements: Node.js 22 or newer and Docker for integration tests.

```bash
git clone https://github.com/DeepZone/container-pilot.git
cd container-pilot
npm test
npm run test:integration
```

Keep changes focused on the core workflow: Detect, Decide, Update, Verify, Recover. Avoid turning Container Pilot into a replacement for Docker Compose, Portainer, or an orchestrator.

## Pull requests

- Explain the problem, behavior change, risks, and validation.
- Add or update tests for changed behavior.
- Update English documentation and relevant German documentation.
- Preserve existing state files and Compose compatibility.
- Document breaking changes and migration requirements explicitly.
- Do not add secrets, production screenshots, or unredacted diagnostics.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

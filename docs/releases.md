# Release process

[Documentation index](../README.md) · [Installation](installation.md)

Container Pilot uses [Semantic Versioning](https://semver.org/). Release candidates use tags such as `v0.9.0-rc.13`; stable releases use tags such as `v1.0.0`.

## Channels

| Git tag | Published image tags | Intended use |
| --- | --- | --- |
| `v0.9.0-rc.13` | `0.9.0-rc.13`, `rc` | controlled release-candidate testing |
| `v1.2.3` | `1.2.3`, `1.2`, `1`, `latest`, `stable` | stable installations |
| push to `main` | `edge`, `sha-<commit>` | development testing only |

`latest`, `stable`, major, and minor aliases are never produced for prereleases. Pin a complete version or commit-specific tag when reproducibility is more important than following a channel.

## Maintainer checklist

1. Update the version in `package.json`, UI asset references, and the changelog.
2. Run unit tests, Docker integration tests, and a local image build.
3. Create and push an annotated `v*` tag.
4. Wait for the **Release image** workflow. It tests before publishing multi-architecture images.
5. Inspect the AMD64 and ARM64 image manifest and its OCI labels.
6. Create the GitHub Release from the same tag and mark prereleases accordingly.
7. Include upgrade notes and label breaking changes explicitly.

Do not publish `v1.0.0` until the release-candidate scenarios have passed on real test installations. Never move or reuse an existing release tag.

## OCI metadata

Published images carry title, description, vendor, source repository, version, commit revision, creation time, and license labels. GitHub Actions supplies release-specific values and publishes only after its test job succeeds.

# Changelog

## Unreleased

- Removed the privately operated telemetry receiver and internal statistics dashboard from the public source repository. Client-side opt-in telemetry remains unchanged.

## 0.9.0-rc.12

- Fixed persistence of the last successful telemetry report and status after payload generation.
- Preserved the live telemetry state object while filling missing fields.
- Added regression coverage for successful report timestamps.

## 0.9.0-rc.11

- Added explicit opt-in anonymous telemetry with a live payload preview, daily jittered reporting, fail-open delivery, local reset/server deletion controls, and persistent update and rollback counters.

## 0.9.0-rc.10

- Restored an anonymized product dashboard preview to the English and German README files.

## 0.9.0-rc.9

- Added optional native HTTPS with file-based certificate and private-key secrets, automatic Secure session cookies, TLS-aware health checks, and a dedicated Compose override.

## 0.9.0-rc.8

- Hide the Watchtower import action unless an administrator has containers with supported Watchtower labels, and reorganize the application navigation into clearer page, administration, action, and account areas.

## 0.9.0-rc.7

- Split CI into lint, unit, Docker integration, dependency security, CodeQL, and multi-architecture build stages; added weekly Dependabot coverage for npm, Docker, and GitHub Actions.
- Added direct CSRF/same-origin and healthcheck/startup-stability unit tests.
- Added opt-in Watchtower label detection with a read-only preview, stale-preview protection, explicit per-container selection, and event-history auditing.
- Added a static public project site with security, migration, installation, and product-positioning sections plus a GitHub Pages deployment workflow.
- Added English and German UI localization with browser detection and a persistent language selector.
- Added generic HTTPS webhook notifications for update, healthcheck, and rollback lifecycle events, with optional file-based bearer authentication.
- Added Docker Secret-based credentials for private Docker Hub, GHCR, GitLab, and generic OCI registries without persisting credentials in application state.
- Added a practical Watchtower migration guide with a conservative label mapping.
- Added source-backed, neutral comparisons with archived Watchtower and active WUD.
- Added an RC tester guide, reproducible scenario matrix, debug-data privacy guidance, and structured feedback form.
- English README is now the primary project entry point; the German documentation remains available as `README.de.md`.
- Added structured installation, configuration, security, update, rollback, reverse-proxy, troubleshooting, contribution, and roadmap documentation.
- Added public issue forms, pull request template, release-note categories, repository topics, and GitHub Discussions.
- Removed the outdated production screenshot and aligned copyright notices with NoiSens Media.
- Release images now use `rc` only for release candidates and reserve `latest`, major, and minor aliases for stable releases.
- Release image publication now depends on successful unit, integration, and Docker build tests.
- Successful `main` builds publish multi-architecture `edge` and immutable `sha-*` development images.
- Added explicit OCI source, version, revision, license, and vendor metadata plus reusable GitHub Actions build caches.
- Added a local Compose development override while keeping the production Quickstart on published images.
- Added a documented Semantic Versioning release process and tightened `.dockerignore` so local secrets and repository-only files never enter the build context.
- Pull requests and branch builds now validate the image for both AMD64 and ARM64 after the test suite succeeds.

## 0.9.0-rc.6

- Rollback-Punkte können nach erfolgreicher Betriebsbeobachtung bewusst verworfen werden.
- Beim Verwerfen wird auch das vorherige Image entfernt.
- Images, die noch von einem laufenden oder gestoppten Container verwendet werden, sind vor dem Löschen geschützt.

## 0.9.0-rc.5

- Eigene Release-Prüfung für Container Pilot über öffentliche GitHub Releases.
- Neues Systemupdate-Dialogfeld mit installierter und verfügbarer Version sowie Release Notes.
- Self-Updates werden von einem getrennten, kurzlebigen Helfercontainer ausgeführt.
- Der bisherige Container bleibt bis zum erfolgreichen Healthcheck erhalten und wird bei Fehlern automatisch wiederhergestellt.
- GitHub-Release-Pipeline veröffentlicht versionierte Multi-Arch-Images nach GHCR; stabile Releases erhalten zusätzlich den Tag `stable`.

## 0.9.0-rc.4

- Rollback-Punkte sind einmalig: Nach erfolgreicher Wiederherstellung verschwindet die Rollback-Aktion.
- Ein späteres Update erzeugt wieder einen neuen Rollback-Punkt.

## 0.9.0-rc.3

- Behebt Variantenwechsel wie Baikal `nginx` → `latest`: geerbte Startbefehle werden durch die Defaults des Ziel-Images ersetzt.
- Explizit konfigurierte Entrypoints und Befehle bleiben beim Image-Wechsel erhalten.
- Container ohne Healthcheck müssen während der gesamten Startprüfung stabil laufen; Neustartschleifen lösen automatisch ein Rollback aus.

## 0.9.0-rc.2

- Bei fest getaggten Containern zeigt die Oberfläche zwei getrennte Entscheidungen: den bestehenden Tag aktualisieren oder bewusst auf `latest` wechseln.
- Automatische Updates bleiben immer auf dem konfigurierten Tag und wechseln niemals selbstständig auf `latest`.
- Die Containerliste kennzeichnet `latest` ausdrücklich als optionale Alternative.
- Rollbacks stellen weiterhin den exakten vorherigen Digest wieder her, führen den Container danach aber wieder unter seinem ursprünglichen Tag. Nachfolgende Updates beziehen dadurch tatsächlich die neue Version dieses Tags.
- Digest-basierte Image-Pulls verwenden die korrekte Docker-API-Referenz.

## 0.9.0-rc.1

- Docker-Healthchecks und konfigurierbare Startbeobachtung entscheiden über den Update-Erfolg.
- Negative Healthchecks und Timeouts lösen die sofortige Wiederherstellung des vorherigen Containers aus.
- Pro Container verhindert eine Aktionssperre parallele Updates und Rollbacks.
- Hostname, Compose-Labels, Netzwerke und fehlende Volume-/Bind-Mounts werden bei der Rekonstruktion bewahrt.
- Unsichere Auto-Remove- und gemeinsame Container-Netzwerkmodi werden abgewiesen.
- UI und Dokumentation warnen vor nicht rückrollbaren Datenbank- und Volume-Änderungen.
- Login-Rate-Limit, zusätzliche Browser-Sicherheitsheader und optional sichere Cookies wurden ergänzt.
- Der Compose-Stack läuft mit reduziertem Privilegienprofil und schreibgeschütztem Root-Dateisystem.
- Eine reale Docker-Integrationstestsuite und GitHub-Actions-Pipeline prüfen Update und automatischen Rollback.

## 0.8.0

- Persistente Digest-basierte Rollback-Punkte und manueller Rollback über die Weboberfläche.

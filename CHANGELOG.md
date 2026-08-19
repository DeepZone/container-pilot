# Changelog

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

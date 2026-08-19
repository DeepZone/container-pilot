# Changelog

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

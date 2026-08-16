# Container Pilot

**Aktuelle Version: 0.3.2** · © 2026 NoiSens Media

Eine eigenständige, kleine Watchtower-Alternative mit Weboberfläche.

- frei einstellbares automatisches Prüfintervall für Docker Hub und GHCR
- wahlweise sofortige Installation gefundener Updates
- Update-Richtlinie pro Container
- manuelle und automatische Updates
- Prüfung, ob `latest` existiert
- expliziter Wechsel auf `latest`
- Rollback, wenn ein Ersatzcontainer nicht startet
- eigene Benutzerverwaltung mit Admin-/Betrachterrollen
- sichere Cookie-Sitzungen, scrypt-Passwort-Hashes und CSRF-Schutz
- Ereignisprotokoll

## Start

```sh
mkdir -p secrets
printf '%s' 'CHANGE-ME' > secrets/admin_password
chmod 600 secrets/admin_password
docker compose up -d --build
```

Die Oberfläche läuft standardmäßig auf Port `3080`. Prüfintervall und automatische Installation werden unter „Automatik“ verwaltet. Zusätzlich muss die Automatik aus Sicherheitsgründen für jeden gewünschten Container freigegeben werden.

Beim ersten Start wird der Benutzer aus `CP_ADMIN_USER` angelegt. Das Passwort aus dem Secret wird nur zur initialen Erstellung benötigt; gespeichert wird ausschließlich ein gesalzener scrypt-Hash. Weitere Benutzer werden in der Weboberfläche verwaltet.

## Einschränkungen

Ein direkter Container-Ersatz ändert keine externe Compose-Datei. Ein späteres `docker compose up` kann einen in der Oberfläche vorgenommenen Tag-Wechsel daher wieder überschreiben. Die Oberfläche kennzeichnet Compose-Container; eine persistente Bearbeitung fremder Portainer-Stacks ist für eine spätere Version vorgesehen.

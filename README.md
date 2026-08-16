# Container Pilot

Eine eigenständige, kleine Watchtower-Alternative mit Weboberfläche.

- stündliche Registry-Prüfung für Docker Hub und GHCR
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

Die Oberfläche läuft standardmäßig auf Port `3080`. Automatische Updates sind aus Sicherheitsgründen zunächst pro Container zu aktivieren.

Beim ersten Start wird der Benutzer aus `CP_ADMIN_USER` angelegt. Das Passwort aus dem Secret wird nur zur initialen Erstellung benötigt; gespeichert wird ausschließlich ein gesalzener scrypt-Hash. Weitere Benutzer werden in der Weboberfläche verwaltet.

## Einschränkungen

Ein direkter Container-Ersatz ändert keine externe Compose-Datei. Ein späteres `docker compose up` kann einen in der Oberfläche vorgenommenen Tag-Wechsel daher wieder überschreiben. Die Oberfläche kennzeichnet Compose-Container; eine persistente Bearbeitung fremder Portainer-Stacks ist für eine spätere Version vorgesehen.

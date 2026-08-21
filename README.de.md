<p align="center"><a href="README.md">English</a> | <strong>Deutsch</strong></p>

<div align="center">
  <img src="src/public/logo.png" alt="Container Pilot – Docker Update Manager" width="90">
  <h1>Docker Update Manager – Container Pilot</h1>
  <p><strong>Moderne deutsche Weboberfläche zur kontrollierten Prüfung und Installation von Docker-Image-Updates.</strong></p>
  <p>
    <img alt="Version 0.9.0 RC11" src="https://img.shields.io/badge/Version-0.9.0--rc.11-d97706">
    <img alt="Node.js 24" src="https://img.shields.io/badge/Node.js-24-339933?logo=nodedotjs&logoColor=white">
    <img alt="Docker" src="https://img.shields.io/badge/Docker-Compose-2496ed?logo=docker&logoColor=white">
    <img alt="Oberfläche Deutsch" src="https://img.shields.io/badge/Oberfläche-Deutsch-d97706">
    <img alt="Lizenz MIT" src="https://img.shields.io/badge/Lizenz-MIT-7c3aed">
    <a href="https://buymeacoffee.com/mail9l"><img alt="Buy Me a Coffee" src="https://img.shields.io/badge/Buy%20me%20a%20coffee-Unterst%C3%BCtzen-FFDD00?logo=buymeacoffee&logoColor=000000"></a>
  </p>
</div>

**Container Pilot ist eine eigenständige Watchtower-Alternative für die zentrale Verwaltung von Docker-Updates.** Die deutschsprachige Weboberfläche erkennt laufende und gestoppte Container, vergleicht lokale Images mit den Registry-Manifesten und ermöglicht kontrollierte manuelle oder automatische Aktualisierungen.

Der Schwerpunkt liegt auf einem nachvollziehbaren Update-Workflow mit **konfigurierbaren Prüfintervallen, Freigabe pro Container, optionaler Sofortinstallation und automatischem Rollback**. Bei Images mit einem festen Tag prüft Container Pilot zusätzlich, ob ein `latest`-Tag vorhanden ist. In der Weboberfläche kann bewusst zwischen einem Update des bestehenden Tags und einem Wechsel auf `latest` entschieden werden. Die Automatik wechselt niemals selbstständig den Tag.

> **Projektstatus:** Version 0.9.0-rc.11 ist ein Release Candidate. Die Update-Engine besitzt Healthcheck-Validierung, Aktionssperren, Self-Updates und Docker-Integrationstests. Vor dem Stable-Release ist ein kontrollierter Praxistest mit den eigenen Stacks vorgesehen.

## Einblick

![Vollständiges Container-Pilot-RC11-Dashboard mit fiktiven Containern, Status, Updates, Automatik und Rollback-Aktionen](docs/container-pilot-overview.png)

*Vollständige RC11-Produktansicht mit rein fiktiven Daten: laufende und gestoppte Container, Health-Status, verfügbare Updates, Automatik pro Container, manuelle Aktionen und Rollback-Funktionen sind auf einen Blick sichtbar.*

## Warum ein eigener Docker Update Manager?

- **Zentrale Docker-Weboberfläche:** Containerstatus, Images, verfügbare Updates und Ereignisse an einem Ort einsehen
- **Kontrollierte Automatik:** Prüfintervall und automatische Installation global steuern
- **Freigabe pro Container:** Nur ausdrücklich aktivierte Container automatisch aktualisieren
- **Manuelle Entscheidungen:** Updates und Wechsel auf `latest` gezielt über die Oberfläche auslösen
- **Nachvollziehbarer Betrieb:** Aktionen, Fehler und Anmeldungen im Ereignisprotokoll verfolgen
- **Interner Mehrbenutzerbetrieb:** Administratoren und rein lesende Benutzer getrennt verwalten

## Funktionen der Docker-Weboberfläche

| Bereich | Möglichkeiten |
| --- | --- |
| **Übersicht** | Anzahl der Container, laufende Instanzen, verfügbare Updates, vorhandene `latest`-Tags sowie letzte und nächste Prüfung anzeigen |
| **Container** | Name, Container-ID, Image, Laufzeitstatus, Updatezustand sowie Zeitpunkt und Art des letzten Updates in einer gemeinsamen Liste einsehen |
| **Update-Prüfung** | Docker Hub und GHCR anhand der Image-Manifeste und Digests prüfen; Fortschritt und Abschlussresultat direkt anzeigen |
| **Automatik** | Prüfung aktivieren, Intervall zwischen 1 Minute und 7 Tagen festlegen und Sofortinstallation ein- oder ausschalten |
| **Richtlinien** | Automatische Installation individuell pro Container freigeben oder sperren; automatische Updates bleiben stets auf dem konfigurierten Tag |
| **Manuelle Updates** | Gefundene Updates unmittelbar installieren und Container mit bestehender Konfiguration neu erstellen |
| **Tag-Wechsel** | Bei fest getaggten Images bewusst zwischen „bestehenden Tag aktualisieren“ und „auf latest wechseln“ entscheiden |
| **Rollback** | Bei Startfehler, negativem Healthcheck oder Timeout automatisch den bisherigen Container wiederherstellen; nach erfolgreichen Updates einen manuellen Rollback anbieten oder den Punkt samt ungenutztem Alt-Image bewusst verwerfen |
| **Aktionssperren** | Update und Rollback pro Container serialisieren und laufende Vorgänge sichtbar machen |
| **Benutzer** | Administrator- und Viewer-Konten über die Weboberfläche verwalten |
| **Ereignisse** | Prüf-, Update-, Fehler-, Benutzer- und Anmeldeereignisse in einem eigenen Menüpunkt nachvollziehen |
| **Systemupdate** | GitHub Releases prüfen und Container Pilot über einen getrennten Helfer mit Healthcheck und automatischer Wiederherstellung aktualisieren |
| **Anonyme Nutzungsstatistiken** | Freiwillig und standardmäßig deaktiviert; exakte Daten vor dem Versand anzeigen, sofort senden, deaktivieren, Identität zurücksetzen oder Serverdaten löschen |

## Freiwillige anonyme Nutzungsstatistiken

Container Pilot enthält eine freiwillige und besonders datensparsame Nutzungsstatistik. Sie soll uns helfen zu verstehen, wie sich das Projekt in realen Installationen und unterschiedlichen Einsatzszenarien verhält. **Die Funktion ist standardmäßig ausgeschaltet und überträgt nichts, bis ein Administrator sie ausdrücklich aktiviert.**

Nach der Aktivierung wird nur das kleinste sinnvoll nutzbare Maß an zusammengefassten technischen Daten übertragen, beispielsweise Container-Pilot- und Docker-Version, Architektur, allgemeines Betriebssystem, aggregierte Containerzahlen, verwendete Funktionskategorien und kumulierte Update-Ergebnisse. Container- oder Image-Namen, IP-Adressen, Hostnamen, Registry-Domains, Zugangsdaten, Umgebungsvariablen, Mount-Pfade und Anwendungsdaten werden niemals übertragen. Die Weboberfläche zeigt vor dem Versand exakt den aktuellen Payload; die Funktion kann jederzeit deaktiviert und die zugehörigen Daten können gelöscht werden.

Wir freuen uns über jeden Administrator, der diese Funktion freiwillig aktiviert. Die anonymen Erkenntnisse aus dem praktischen Einsatz helfen uns, Kompatibilität, Zuverlässigkeit und Zugänglichkeit gezielt zu verbessern, damit Container Pilot in möglichst vielen Umgebungen und für möglichst viele Menschen gut funktioniert. Alle Einzelheiten stehen unter [Telemetrie und Datenschutz](docs/telemetry.md).

## Architektur: Weboberfläche, Docker API und Registry

```mermaid
flowchart LR
    U["Administrator / Betrachter"] -->|HTTPS oder Reverse Proxy| C["Container Pilot"]
    C -->|Unix Socket| D["Docker Engine"]
    C -->|Manifest- und Digest-Prüfung| R["Docker Hub / GHCR"]
    D --> K["Verwaltete Container"]
    C --> S[("Persistentes Datenvolume")]
```

Container Pilot kommuniziert direkt mit der lokalen Docker Engine über deren Unix-Socket. Registry-Prüfungen erfolgen für öffentliche Images über die Manifest-Endpunkte von Docker Hub und GHCR. Benutzer, Einstellungen, Container-Richtlinien, Prüfergebnisse und Ereignisse werden in einem persistenten Docker-Volume gespeichert.

## Voraussetzungen für Container Pilot

- Docker Engine mit Docker Compose
- Zugriff auf `/var/run/docker.sock`
- ausgehender HTTPS-Zugriff auf die verwendeten Container-Registries
- ein geschütztes internes Managementnetz oder ein abgesicherter Reverse Proxy

## Container Pilot mit Docker Compose starten

Repository klonen und Secret-Verzeichnis vorbereiten:

```bash
git clone https://github.com/DeepZone/container-pilot.git
cd container-pilot
mkdir -p secrets
```

Ein starkes initiales Administratorkennwort hinterlegen:

```bash
openssl rand -base64 32 > secrets/admin_password
chmod 600 secrets/admin_password
```

Anschließend das veröffentlichte Image starten:

```bash
docker compose pull
docker compose up -d
```

Die Weboberfläche ist standardmäßig unter `http://127.0.0.1:3080` beziehungsweise der Adresse des Docker-Hosts auf Port `3080` erreichbar. Mit `compose.https.yml` kann Container Pilot HTTPS auch direkt bereitstellen; alternativ bleibt ein abgesicherter Reverse Proxy möglich. Details stehen unter [HTTPS und Reverse Proxy](docs/reverse-proxy.md).

Beim ersten Start wird der Benutzer aus `CP_ADMIN_USER` angelegt. Das Kennwort aus dem Docker Secret wird nur für die initiale Erstellung verwendet; persistent gespeichert wird ausschließlich der gesalzene scrypt-Hash.

## Umgebungsvariablen

| Variable | Standard | Beschreibung |
| --- | --- | --- |
| `TZ` | `Europe/Berlin` | Zeitzone des Containers |
| `CP_PORT` | `8080` | interner HTTP- oder HTTPS-Port der Weboberfläche |
| `CP_ADMIN_USER` | `admin` | initialer Administratorname |
| `CP_ADMIN_PASSWORD_FILE` | `/run/secrets/admin_password` | Datei mit dem erforderlichen initialen Administratorkennwort |
| `CP_SCAN_INTERVAL_MINUTES` | `60` | initiales Prüfintervall; spätere Änderungen erfolgen in der Weboberfläche |
| `CP_AUTO_DEFAULT` | `false` | Standardwert für die automatische Installation bei noch nicht konfigurierten Containern |
| `CP_HEALTH_TIMEOUT_SECONDS` | `120` | maximale Wartezeit auf einen erfolgreichen Docker-Healthcheck |
| `CP_STARTUP_GRACE_SECONDS` | `5` | Beobachtungszeit für Container ohne eigenen Healthcheck |
| `CP_SECURE_COOKIE` | `false` | `true` hinter einem HTTPS-Reverse-Proxy; markiert das Sitzungscookie als Secure |
| `CP_TLS_CERT_FILE` | nicht gesetzt | PEM-Zertifikat oder vollständige Zertifikatskette; aktiviert zusammen mit `CP_TLS_KEY_FILE` natives HTTPS |
| `CP_TLS_KEY_FILE` | nicht gesetzt | PEM-Datei mit dem privaten Schlüssel für natives HTTPS |
| `CP_TLS_KEY_PASSPHRASE_FILE` | nicht gesetzt | optionale Secret-Datei mit der Passphrase des privaten Schlüssels |
| `CP_STORE_FILE` | `/data/state.json` | Pfad der persistenten Zustandsdatei |
| `DOCKER_SOCKET` | `/var/run/docker.sock` | Pfad zum Docker-Unix-Socket |
| `CP_SELF_UPDATE_REPOSITORY` | `DeepZone/container-pilot` | öffentliches GitHub-Repository für Release-Prüfungen |
| `CP_SELF_UPDATE_IMAGE` | `ghcr.io/deepzone/container-pilot` | Registry-Repository der versionierten Release-Images |
| `CP_SELF_UPDATE_CHANNEL` | `stable` | `stable` ignoriert Vorabversionen; `prerelease` berücksichtigt sie |

## Benutzer und Rollen

- **Administrator:** Container prüfen und aktualisieren, Automatik verwalten sowie Benutzer anlegen und löschen
- **Viewer:** Containerstatus, Prüfergebnisse und Ereignisse ausschließlich lesen

Sitzungen bleiben zwölf Stunden gültig und werden beim Ändern des eigenen Kennworts beendet. Benutzerkonten, Rollen und Einstellungen liegen im persistenten Volume `container-pilot-data`.

## Sicherheit im Docker-Betrieb

Anonyme Nutzungsstatistiken sind freiwillig, standardmäßig deaktiviert und transparent unter [Telemetrie und Datenschutz](docs/telemetry.md) dokumentiert.

Der eingebundene Docker-Socket ermöglicht weitreichende Kontrolle über den Docker-Host. Container Pilot gehört deshalb ausschließlich in eine vertrauenswürdige Verwaltungsumgebung.

- Weboberfläche nicht ungeschützt im öffentlichen Internet bereitstellen
- `CP_BIND_ADDRESS=127.0.0.1` setzen, wenn ausschließlich ein lokaler Reverse Proxy zugreifen soll
- hinter einem HTTPS-Reverse-Proxy `CP_SECURE_COOKIE=true` setzen; bei nativem HTTPS geschieht das automatisch
- starke, individuelle Kennwörter und möglichst restriktive Rollen verwenden
- Zugriff auf Port `3080` per Firewall, VPN oder Reverse Proxy begrenzen
- Docker-Socket niemals an nicht vertrauenswürdige Anwendungen weiterreichen
- Secret-Dateien, Zustandsdaten und Sicherungen nicht in Git einchecken
- persistentes Datenvolume regelmäßig sichern
- automatische Updates zunächst an unkritischen Containern testen
- vor großen Versionssprüngen anwendungsspezifische Sicherungen erstellen

Die Anwendung nutzt HTTP-only-Sitzungscookies, SameSite-Schutz, CSRF-Prüfungen und gesalzene scrypt-Kennworthashes. Container Pilot selbst ist über das Label `container-pilot.watch=false` von seinen automatischen Updates ausgenommen.

Eigene Updates werden im Menü **Systemupdate** verwaltet. Container Pilot startet dafür einen kurzlebigen Helfercontainer aus dem aktuell laufenden Image. Der Helfer lädt das versionierte Ziel-Image, ersetzt Container Pilot und wartet auf dessen Healthcheck. Schlägt Start oder Healthcheck fehl, wird automatisch der bisherige Container unter seinem ursprünglichen Namen wiederhergestellt. Der Status liegt persistent unter `/data/self-update.json` und ist nach einem Neustart weiterhin sichtbar.

Der mitgelieferte Compose-Stack läuft ohne Linux-Capabilities, mit `no-new-privileges`, schreibgeschütztem Root-Dateisystem und begrenztem temporärem Dateisystem. Der Docker-Socket bleibt dennoch eine hochprivilegierte Schnittstelle: Wer Container Pilot administrieren kann, kann mittelbar Container auf dem Host ersetzen.

## Update- und Rollback-Sicherheit

Container Pilot wartet nach dem Ersatz eines laufenden Containers auf dessen Docker-Healthcheck. Der alte Container wird erst gelöscht, wenn der neue Zustand `healthy` erreicht. Bei `unhealthy`, einem vorzeitigen Prozessende oder Timeout wird der neue Container entfernt und der alte Container unter seinem ursprünglichen Namen neu gestartet. Ohne definierten Healthcheck gilt eine konfigurierbare Startbeobachtung.

Gleichzeitige Update- oder Rollback-Aktionen auf demselben Container werden abgewiesen. Environment, Labels, Hostname, Restart-Policy, Portbindungen, Netzwerke sowie benannte, anonyme und Bind-Mounts werden aus der bestehenden Docker-Konfiguration übernommen. Unsichere `AutoRemove`-Container und der Netzwerkmodus `container:…` werden nicht automatisch ersetzt.

Ein Rollback startet exakt den gespeicherten Image-Digest, ordnet ihn aber wieder dem ursprünglichen Image-Tag zu. Dadurch bleibt der Container nicht dauerhaft auf einer unveränderlichen `@sha256:…`-Referenz hängen und kann später wieder regulär innerhalb seines Tags aktualisiert werden.

> **Datensicherheit:** Ein Image-Rollback setzt niemals Daten in Volumes oder Datenbanken zurück. Bereits ausgeführte Schema- oder Datenmigrationen können inkompatibel mit dem alten Image sein. Vor automatischen Updates migrationsfähiger Anwendungen sind anwendungsspezifische Backups erforderlich.

## Tests

```bash
npm test
```

Die reguläre Suite prüft Authentifizierung, Sessions, Image-Referenzen und Sicherheitsgrenzen der Container-Ersetzung. Der reale Docker-Test erstellt isolierte Testcontainer, ein Netzwerk und ein Volume, prüft die Konfigurationsübernahme und erzwingt anschließend einen negativen Healthcheck zur Kontrolle des automatischen Rollbacks:

```bash
npm run test:integration
```

Die GitHub-Actions-Pipeline führt beide Teststufen sowie einen Image-Build aus.

Veröffentlichte Releases werden erst nach erfolgreichen Tests als Multi-Arch-Images gebaut. `latest` und `stable` werden ausschließlich für stabile Releases verwendet; Builds aus `main` erscheinen zu Testzwecken als `edge` und `sha-*`. Details stehen im englischen [Release-Prozess](docs/releases.md).

## Hinweise und Einschränkungen

- Der direkte Container-Ersatz verändert keine externe Compose-Datei. Ein späteres `docker compose up` kann einen über die Weboberfläche vorgenommenen Image- oder Tag-Wechsel wieder überschreiben.
- Private Registries und authentifizierte private Images werden derzeit nicht unterstützt.
- Registry-Prüfungen sind aktuell für Docker Hub und GHCR vorgesehen.
- Container ohne Docker-Healthcheck können nur auf Prozessstabilität während der Startbeobachtung geprüft werden.
- Healthchecks bestätigen die technische Betriebsbereitschaft, ersetzen jedoch keine fachlichen End-to-End-Tests.
- Image-Rollbacks setzen keine Volumes, Datenbanken oder Migrationen zurück.
- Der Wechsel auf `latest` kann einen großen Versionssprung auslösen und muss deshalb bewusst bestätigt werden.

## Mitwirken

Fehlerberichte und nachvollziehbare Verbesserungsvorschläge sind willkommen. Bitte niemals Kennwörter, Registry-Tokens, private Image-Namen, vollständige Zustandsdateien, interne Hostnamen oder produktive Ereignisprotokolle in Issues veröffentlichen. Für Beispiele ausschließlich anonymisierte Daten verwenden.

Die ausführliche Dokumentation wird zunächst auf Englisch unter [`docs/`](docs/) gepflegt. Beiträge für eine vollständige deutsche Übersetzung sind willkommen.

## Lizenz und Copyright

Copyright © 2026 NoiSens Media.

Container Pilot ist unter der [MIT-Lizenz](LICENSE) veröffentlicht. Nutzung, Änderung und Weitergabe sind unter den Bedingungen der Lizenz gestattet. Die Software wird ohne Gewährleistung bereitgestellt.

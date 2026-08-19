# Sicherheit

## Sicherheitsmeldungen

Bitte veröffentliche vermutete Sicherheitslücken nicht zusammen mit Kennwörtern, Tokens, internen Adressen, privaten Image-Namen oder Zustandsdateien in einem öffentlichen Issue. Melde zunächst ausschließlich eine knappe, anonymisierte Beschreibung an den Projektbetreiber NoiSens Media.

## Vertrauensgrenze

Container Pilot benötigt schreibenden Zugriff auf die Docker API, um Container zu ersetzen. Zugriff auf die Administratoroberfläche ist deshalb als privilegierter Zugriff auf den Docker-Host zu behandeln. Die Anwendung sollte nur in einem vertrauenswürdigen Verwaltungsnetz, per VPN oder hinter einem HTTPS-Reverse-Proxy erreichbar sein.

## Unterstützte Versionen

Sicherheitskorrekturen werden während der Release-Candidate-Phase ausschließlich für den jeweils neuesten Stand bereitgestellt.

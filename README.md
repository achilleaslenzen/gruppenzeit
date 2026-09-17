# Gruppenzeit

Kleine, werbefreie PWA für einen Gruppenkalender. Mitglieder öffnen ihren persönlichen Einladungslink und melden sich für Termine, Anfragen oder buchbare Slots. Ein Admin legt Einträge und Einladungen an.

## Start

Node.js 22.13+ (empfohlen: 24) wird benötigt. Keine npm-Abhängigkeiten.

```bash
export ADMIN_TOKEN="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))")"
export DATA_FILE="./data/gruppenzeit.sqlite"
npm start
```

`http://localhost:3000` öffnen und den Admin-Schlüssel eingeben. Unter „Mitglieder“ einen Namen anlegen und den angezeigten persönlichen Link weitergeben. Der Schlüssel ist beim nächsten Serverstart derselbe zu setzen. Die Datenbank und der Admin-Schlüssel gehören nicht ins Repository. Für Zugriff übers Internet HTTPS und einen vertrauenswürdigen Host verwenden.

`PORT` setzt den Port (Standard 3000), `HOST` die Bind-Adresse (Standard 127.0.0.1). Die App verschickt keine Nachrichten oder Push-Benachrichtigungen; Mitglieder sehen neue Anfragen beim Öffnen. Sie ist nicht veröffentlicht oder gehostet.

## Entwicklung

```bash
npm test
```

Architektur und Qualitätsziele: [ARC42.md](ARC42.md). Fachverhalten: [features/gruppenkalender.feature](features/gruppenkalender.feature). Der lokale Datenspeicher enthält Namen und Antworten; regelmäßige gesicherte Backups der SQLite-Datei und ein gelegentlicher Restore-Test sind für einen produktiven Betrieb nötig.

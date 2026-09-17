# Architektur – Gruppenzeit

## Ziel und Kontext

Ein kleiner privater Gruppenkalender für Mitglieder und eine verwaltende Person. Kostenloser Eigenbetrieb, ohne Werbung und Tracking. Links gelten als persönliche Zugangsschlüssel; Weitergabe ermöglicht Zugriff im Namen des Mitglieds.

## Randbedingungen und Qualitätsziele

- Node.js HTTP und SQLite (`node:sqlite`), Browser-PWA ohne Drittanbieter-Runtime. Eine Instanz und eine lokale Datenbank.
- Mobile Bedienung: Link öffnen, Eintrag wählen, Antwort tippen. Keine Pflicht zur Installation.
- Datenschutz: nur Anzeigename, Termine und Antworten speichern; keine Inhalte oder Schlüssel protokollieren. Keine externen Fonts, Analytics oder Push-Dienste.
- Konsistenz: Zusagen für begrenzte Plätze werden innerhalb einer SQLite-Schreibtransaktion geprüft. Ein Mitglied hat höchstens eine Antwort je Eintrag.
- Betrieb: HTTPS am Reverse Proxy, geheimen Admin-Schlüssel als Umgebungsvariable, geschützte Datenbank-Backups samt Restore-Test.

## Bausteine und Grenzen

```text
public/                         Browseroberfläche und PWA-Assets
src/transport/http.js           HTTP, Eingabevalidierung, Auth und statische Assets
src/application/calendar.js     Anwendungsfälle und Repository-Port-Nutzung
src/domain/rules.js             Fachregeln ohne HTTP/SQL
src/infrastructure/sqlite.js    SQL, Migrationen und Transaktionen
src/server.js                   Composition Root
```

Abhängigkeiten zeigen nach innen: Transport ruft Application auf; Application nutzt Domain und einen injizierten Repository-Port; Infrastructure implementiert diesen Port. SQL bleibt in Infrastructure. Die Oberfläche spricht ausschließlich über JSON-HTTP. Anders als Gulasch ERP ist dies ein einzelner fachlicher Kontext ohne Tenant-Core; dessen Tenant-Sonderregeln werden hier nicht übernommen.

## Laufzeit

1. Beim Start werden versionierte Migrationen angewandt; es gibt keine automatische Demo-Datenbefüllung.
2. Admin authentifiziert sich mit `ADMIN_TOKEN`, erzeugt Mitglieder und Einträge.
3. Persönlicher Link enthält einen zufälligen Schlüssel im Fragment. Der Browser speichert ihn lokal und sendet ihn als Bearer-Header; Fragmente gehen nicht an den Server.
4. Bei einer Zusage prüft die Domain die Antwort, die Persistenz zählt innerhalb `BEGIN IMMEDIATE` die Zusagen und schreibt oder meldet „ausgebucht“.

## Entscheidungen und Grenzen

- Mitgliedslinks sind Zugangsdaten, keine starke Identitätsprüfung. Auf gemeinsam genutzten Geräten sollte man die Sitzung abmelden. Admin kann Einladungen neu erzeugen und damit alte Links ungültig machen.
- Kein E-Mail-Versand, keine Benachrichtigung, keine Kommentare, keine Wiederholungstermine. Keine Offline-Mutationen; der Service Worker speichert nur statische Assets.
- Für mehrere Serverinstanzen oder größere Gruppen wäre ein gemeinsamer Datenbankdienst nötig. Das MVP ist für einen einzelnen Prozess konzipiert.

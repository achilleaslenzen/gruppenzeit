# Gruppenzeit auf dem bestehenden IONOS-Server

Ziel: `termin.gulasch.info` auf derselben VM wie `app.gulasch.info`, aber mit eigenem Dienst (`gruppenzeit`), Port 3001, Nutzer, SQLite-Datei und Backup. Der Gastro-Dienst auf Port 3000 bleibt unabhängig. Die folgenden Schritte benötigen Root-/sudo-Zugriff auf die VM. Kein Admin-Schlüssel gehört in GitHub oder in einen Chat.

## 1. DNS

Bei IONOS einen A-Record für `termin.gulasch.info` mit derselben IPv4-Adresse wie `app.gulasch.info` anlegen. Falls die bestehende Domain einen AAAA-Record nutzt und die VM per IPv6 erreichbar ist, analog einen AAAA-Record anlegen. Vor Certbot prüfen, dass `termin.gulasch.info` zur VM auflöst.

## 2. Getrennte Laufzeit vorbereiten

Auf dem Server als Root ausführen:

```sh
node --version
node -e "import('node:sqlite').then(() => console.log('SQLite verfügbar'))"
apt install -y sqlite3
useradd --system --home-dir /opt/gruppenzeit --shell /usr/sbin/nologin gruppenzeit
install -d -o gruppenzeit -g gruppenzeit -m 750 /opt/gruppenzeit /var/lib/gruppenzeit
install -d -m 700 /var/backups/gruppenzeit
install -d -m 750 /etc/gruppenzeit
git clone https://github.com/achilleaslenzen/gruppenzeit.git /opt/gruppenzeit
chown -R gruppenzeit:gruppenzeit /opt/gruppenzeit
```

Der bestehende Node-Prozess benötigt Port 3000; Gruppenzeit verwendet 3001. Wenn die `useradd`-/`git clone`-Schritte nach einem Teilversuch melden, dass Nutzer oder Verzeichnis bereits existieren, den Zustand prüfen und nicht blind erneut ausführen.

Admin-Schlüssel als Root **auf dem Server** erzeugen, in eine nur für den Dienst lesbare Umgebungsdatei schreiben und die letzte Zeile lokal ablesen. Die Datei nicht in Git committen:

```sh
printf 'HOST=127.0.0.1\nPORT=3001\nDATA_FILE=/var/lib/gruppenzeit/gruppenzeit.sqlite\nADMIN_TOKEN=%s\n' "$(openssl rand -hex 32)" > /etc/gruppenzeit/gruppenzeit.env
chown root:gruppenzeit /etc/gruppenzeit/gruppenzeit.env
chmod 640 /etc/gruppenzeit/gruppenzeit.env
```

Den Schlüssel sicher aufbewahren; er gilt nur für die Serverinstallation. Der Schlüssel aus Termux ist unabhängig. Nach der ersten Anmeldung Mitglieder neu einladen. Testdaten auf dem Handy werden nicht automatisch übertragen.

## 3. Dienst, Proxy und HTTPS

```sh
cp /opt/gruppenzeit/deploy/gruppenzeit.service /etc/systemd/system/gruppenzeit.service
systemctl daemon-reload
systemctl enable --now gruppenzeit
systemctl is-active gruppenzeit
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/
cp /opt/gruppenzeit/deploy/nginx.conf /etc/nginx/sites-available/gruppenzeit
ln -s /etc/nginx/sites-available/gruppenzeit /etc/nginx/sites-enabled/gruppenzeit
nginx -t
systemctl reload nginx
certbot --nginx -d termin.gulasch.info --redirect
certbot renew --dry-run
```

Certbot setzt die Zertifikatspfade erst nach erfolgreichem DNS/HTTP-Check ein. Nginx und der neue Dienst lauschen lokal getrennt von Gulasch ERP. Extern nur HTTPS verwenden; Port 3001 nicht in der Firewall öffnen.

## 4. Backups und Wiederherstellung prüfen

```sh
sh /opt/gruppenzeit/deploy/backup.sh
ls -lh /var/backups/gruppenzeit/
```

Als Root über `crontab -e` z. B. täglich um 03:15 UTC ausführen:

```cron
15 3 * * * /bin/sh /opt/gruppenzeit/deploy/backup.sh >> /var/log/gruppenzeit-backup.log 2>&1
```

Ein Restore-Test muss separat stattfinden: Backup in ein temporäres Verzeichnis entpacken, `sqlite3 RESTORE.sqlite 'PRAGMA integrity_check;'` prüfen und mit einer **separaten Testinstanz** gegen diese Datei einen Eintrag lesen. Produktive Daten nicht für einen Test überschreiben. Backups außerhalb der VM sind sinnvoll, da VM-Ausfall sonst auch die lokalen Sicherungen treffen kann.

## 5. GitHub Actions

Im Repository `gruppenzeit` ein Environment `production` und die Repository- oder Environment-Secrets `IONOS_HOST`, `IONOS_USER`, `IONOS_SSH_KEY` sowie optional `IONOS_SSH_PORT` konfigurieren. Der Schlüssel benötigt nur die für diesen Dienst nötigen SSH-/sudo-Rechte. Der Workflow zieht spätere Änderungen per `git pull --ff-only`, startet ausschließlich `gruppenzeit` neu und prüft HTTP 200/401 auf Port 3001. Der bestehende Gulasch-Workflow wird nicht berührt. Nach den Schritten 1–4 einen initialen `workflow_dispatch` ausführen. Erst danach die Repository-Variable `GRUPPENZEIT_DEPLOY_ENABLED=true` setzen, damit spätere Pushes automatisch deployen. Ohne diese Variable werden Push-Deploys übersprungen.

## 6. Abschlusskontrolle

`https://termin.gulasch.info/` öffnen, mit dem neuen Server-Admin-Schlüssel anmelden, ein Testmitglied einladen und eine Antwort speichern. Danach den Dienst neu starten und prüfen, dass die Antwort noch vorhanden ist. `journalctl -u gruppenzeit -n 50 --no-pager` hilft bei Fehlern; keine Schlüssel oder Einladungslinks in Tickets oder Chats kopieren.

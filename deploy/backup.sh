#!/bin/sh
set -eu
umask 077
source_db=/var/lib/gruppenzeit/gruppenzeit.sqlite
backup_dir=/var/backups/gruppenzeit
mkdir -p "$backup_dir"
if [ ! -f "$source_db" ]; then
  echo 'Gruppenzeit-Datenbank fehlt.' >&2
  exit 1
fi
stamp=$(date -u +%Y%m%dT%H%M%SZ)
temp_db="$backup_dir/.gruppenzeit-$stamp.sqlite"
trap 'rm -f "$temp_db"' EXIT HUP INT TERM
sqlite3 "$source_db" ".backup '$temp_db'"
integrity=$(sqlite3 "$temp_db" 'PRAGMA integrity_check;')
if [ "$integrity" != 'ok' ]; then
  echo 'Backup-Integritätsprüfung fehlgeschlagen.' >&2
  exit 1
fi
gzip -c "$temp_db" > "$backup_dir/gruppenzeit-$stamp.sqlite.gz"
find "$backup_dir" -maxdepth 1 -type f -name 'gruppenzeit-*.sqlite.gz' -mtime +14 -delete
echo 'Gruppenzeit-Backup erstellt und geprüft.'

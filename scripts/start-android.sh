#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if ! node -e "import('node:sqlite')" >/dev/null 2>&1; then
  echo 'Diese Node.js-Version unterstützt node:sqlite nicht. Bitte Termux/Node.js aktualisieren.' >&2
  exit 1
fi
config_dir="$HOME/.config/gruppenzeit"
key_file="$config_dir/admin-token"
umask 077
mkdir -p "$config_dir"
if [ "${1:-}" = '--new-key' ] || [ ! -s "$key_file" ]; then
  node -e "process.stdout.write(require('node:crypto').randomBytes(24).toString('base64url'))" > "$key_file"
fi
ADMIN_TOKEN="$(cat "$key_file")"
export ADMIN_TOKEN
echo 'Öffne auf diesem Handy: http://127.0.0.1:3000'
printf '\nAdmin-Schlüssel – genau diese eine Zeile kopieren:\n%s\n\n' "$ADMIN_TOKEN"
echo 'Termux geöffnet lassen. Zum Beenden Strg+C drücken.'
npm start

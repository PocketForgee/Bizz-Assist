#!/usr/bin/env bash
# Nightly Postgres dump, kept 14 days. Install once on the server:
#   (crontab -l 2>/dev/null; echo "30 3 * * * $PWD/backup.sh >> $HOME/bizzassist-backups/backup.log 2>&1") | crontab -
# Restore:  gunzip -c FILE.sql.gz | docker compose exec -T db psql -U bizzassist -d bizzassist
set -euo pipefail
cd "$(dirname "$0")"

DIR="${BACKUP_DIR:-$HOME/bizzassist-backups}"
mkdir -p "$DIR"
FILE="$DIR/bizzassist-$(date -u +%Y%m%d-%H%M%S).sql.gz"

docker compose exec -T db pg_dump -U bizzassist -d bizzassist --no-owner | gzip > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
chmod 600 "$FILE"
find "$DIR" -name 'bizzassist-*.sql.gz' -mtime +14 -delete
echo "$(date -u +%FT%TZ) backup ok: $FILE ($(du -h "$FILE" | cut -f1))"

#!/usr/bin/env bash
# Nightly SQLite backup with 14-day rotation. Installed to cron by setup-vps.sh.
set -euo pipefail

DB="/home/powval/app/data/powval.db"
DEST="/home/powval/backups"
STAMP="$(date +%Y-%m-%d)"

mkdir -p "${DEST}"
# .backup is transactionally safe against a live WAL database.
sqlite3 "${DB}" ".backup '${DEST}/powval-${STAMP}.db'"
gzip -f "${DEST}/powval-${STAMP}.db"

# Keep the newest 14 backups.
ls -1t "${DEST}"/powval-*.db.gz 2>/dev/null | tail -n +15 | xargs -r rm --

echo "$(date -Is) backup ok: powval-${STAMP}.db.gz"

#!/usr/bin/env bash
# Nightly SQLite backup with 14-day rotation + daily email report.
# Cron-installed by setup-vps.sh.
#
# Config (read from /home/powval/app/.env; all optional):
#   RESEND_API_KEY    - Resend API key. Without it, no email is sent.
#   BACKUP_EMAIL_TO   - recipient, e.g. will.lehmann@powval.com
#   BACKUP_EMAIL_FROM - verified Resend sender, e.g. "PowVal Backups <backups@powval.com>"
#   HEALTHCHECK_URL   - optional healthchecks.io dead-man's-switch backstop
#                       (catches the case where the whole box/cron dies and no email is sent)
set -uo pipefail

DB="/home/powval/app/data/powval.db"
DEST="/home/powval/backups"
ENV_FILE="/home/powval/app/.env"
STAMP="$(date +%Y-%m-%d)"
HOST="$(hostname)"

# Pull individual values out of .env without sourcing the whole file.
getenv() { grep -E "^$1=" "${ENV_FILE}" 2>/dev/null | cut -d= -f2- || true; }
RESEND_API_KEY="$(getenv RESEND_API_KEY)"
EMAIL_TO="$(getenv BACKUP_EMAIL_TO)"
EMAIL_FROM="$(getenv BACKUP_EMAIL_FROM)"
HEALTHCHECK_URL="$(getenv HEALTHCHECK_URL)"
RESEND_API_URL="$(getenv RESEND_API_URL)"; RESEND_API_URL="${RESEND_API_URL:-https://api.resend.com/emails}"

send_email() {  # $1 subject, $2 body
  [[ -n "${RESEND_API_KEY}" && -n "${EMAIL_TO}" && -n "${EMAIL_FROM}" ]] || return 0
  local payload
  payload="$(jq -nc --arg f "${EMAIL_FROM}" --arg t "${EMAIL_TO}" --arg s "$1" --arg b "$2" \
    '{from:$f, to:[$t], subject:$s, text:$b}')"
  # Email failure must never fail the backup itself — log and move on.
  curl -fsS -m 15 --retry 2 "${RESEND_API_URL}" \
    -H "Authorization: Bearer ${RESEND_API_KEY}" \
    -H "Content-Type: application/json" \
    --data "${payload}" -o /dev/null \
    || echo "$(date) WARN: backup report email failed to send"
}

ping_hc() {  # $1: "" on success, "/fail" on failure
  [[ -n "${HEALTHCHECK_URL}" ]] || return 0
  curl -fsS -m 10 --retry 3 "${HEALTHCHECK_URL}${1:-}" -o /dev/null || true
}

# Run the backup as an && chain so the first failure stops it; capture all output.
if out="$( { mkdir -p "${DEST}" \
    && sqlite3 "${DB}" ".backup '${DEST}/powval-${STAMP}.db'" \
    && gzip -f "${DEST}/powval-${STAMP}.db" \
    && ls -1t "${DEST}"/powval-*.db.gz 2>/dev/null | tail -n +15 | xargs -r rm --; } 2>&1 )"; then
  size="$(du -h "${DEST}/powval-${STAMP}.db.gz" 2>/dev/null | cut -f1 || echo '?')"
  kept="$(ls -1 "${DEST}"/powval-*.db.gz 2>/dev/null | wc -l | tr -d ' ')"
  echo "$(date) backup ok: powval-${STAMP}.db.gz (${size}), ${kept} kept"
  send_email "PowVal backup OK: ${STAMP}" \
"Backup succeeded on ${HOST} at $(date).

File:     powval-${STAMP}.db.gz (${size})
Retained: ${kept} backups in ${DEST}"
  ping_hc
else
  echo "$(date) backup FAILED"; echo "${out}"
  send_email "PowVal backup FAILED: ${STAMP}" \
"Backup FAILED on ${HOST} at $(date).

Output:
${out}

Investigate on the server (journalctl, ${DEST})."
  ping_hc /fail
  exit 1
fi

#!/usr/bin/env bash
# Deploy the latest main to this VPS. Run as the powval user (or root):
#   ssh powval@<vps> '/home/powval/app/deploy/deploy.sh'
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "${APP_DIR}"
echo "== Pulling latest main"
git pull --ff-only
npm ci --omit=dev --silent

echo "== Restarting service"
if [[ $EUID -eq 0 ]]; then systemctl restart powval; else sudo systemctl restart powval; fi
sleep 1.5

echo "== Health check"
code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/)
if [[ "${code}" == "200" ]]; then
  echo "== Deployed OK ($(git rev-parse --short HEAD))"
else
  echo "!! Health check returned ${code} — check: journalctl -u powval -n 50"
  exit 1
fi

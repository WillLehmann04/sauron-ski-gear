#!/usr/bin/env bash
# One-time provisioning for a fresh Ubuntu 24.04 VPS (run as root).
# Installs Node 22, Caddy, the app as a systemd service, firewall, backups.
#
#   curl -fsSO https://raw.githubusercontent.com/<you>/sauron-ski-gear/main/deploy/setup-vps.sh
#   bash setup-vps.sh
#
# Idempotent: safe to re-run.
set -euo pipefail

APP_USER="powval"
APP_DIR="/home/${APP_USER}/app"
REPO_URL="${REPO_URL:-git@github.com:WillLehmann04/sauron-ski-gear.git}"
DOMAIN="${DOMAIN:-powval.com}"

echo "== PowVal VPS setup: user=${APP_USER} dir=${APP_DIR} domain=${DOMAIN}"

# ── System packages ──────────────────────────────────────────────
apt-get update -qq
apt-get install -y -qq curl git ufw sqlite3 debian-keyring debian-archive-keyring apt-transport-https

# ── Firewall: SSH + HTTP(S) only ─────────────────────────────────
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
echo "== Firewall: 22/80/443 open, everything else closed"

# ── Node 22 LTS (NodeSource) ─────────────────────────────────────
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs
fi
echo "== Node $(node -v)"

# ── Caddy (official repo) ────────────────────────────────────────
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy
fi
echo "== Caddy $(caddy version | head -c 20)"

# ── App user + deploy key ────────────────────────────────────────
if ! id "${APP_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "${APP_USER}"
fi
sudo -u "${APP_USER}" bash -c '
  if [[ ! -f ~/.ssh/id_ed25519 ]]; then
    mkdir -p ~/.ssh && chmod 700 ~/.ssh
    ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519 -C "powval-deploy" -q
  fi'
echo ""
echo "== Add this READ-ONLY deploy key to the GitHub repo (Settings > Deploy keys):"
echo "----------------------------------------------------------------------"
cat "/home/${APP_USER}/.ssh/id_ed25519.pub"
echo "----------------------------------------------------------------------"
read -rp "Press Enter once the deploy key is added on GitHub..."

# ── Clone / update the app ───────────────────────────────────────
if [[ ! -d "${APP_DIR}/.git" ]]; then
  sudo -u "${APP_USER}" GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=accept-new" \
    git clone "${REPO_URL}" "${APP_DIR}"
else
  sudo -u "${APP_USER}" git -C "${APP_DIR}" pull --ff-only
fi
sudo -u "${APP_USER}" bash -c "cd '${APP_DIR}' && npm ci --omit=dev"

# ── Environment file ─────────────────────────────────────────────
if [[ ! -f "${APP_DIR}/.env" ]]; then
  cat > "${APP_DIR}/.env" <<ENV
PORT=3000
TRUST_PROXY_HOPS=2
ENV
  chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env"
  chmod 600 "${APP_DIR}/.env"
fi

# ── systemd service ──────────────────────────────────────────────
cp "${APP_DIR}/deploy/powval.service" /etc/systemd/system/powval.service
systemctl daemon-reload
systemctl enable --now powval
sleep 1
systemctl --no-pager --lines=3 status powval || true

# ── Caddy config ─────────────────────────────────────────────────
sed "s/{\$DOMAIN}/${DOMAIN}/g" "${APP_DIR}/deploy/Caddyfile" > /etc/caddy/Caddyfile
systemctl reload caddy

# ── Nightly DB backup (3:15am) ───────────────────────────────────
cat > /etc/cron.d/powval-backup <<CRON
15 3 * * * ${APP_USER} ${APP_DIR}/deploy/backup-db.sh >> /home/${APP_USER}/backups/backup.log 2>&1
CRON
sudo -u "${APP_USER}" mkdir -p "/home/${APP_USER}/backups"
chmod 644 /etc/cron.d/powval-backup

echo ""
echo "== Done. Checks:"
echo "   curl -s http://127.0.0.1:3000/ | head -c 80   # app answers locally"
echo "   Then point DNS at this box (see docs/deployment.md) and Caddy"
echo "   will fetch the HTTPS certificate automatically."

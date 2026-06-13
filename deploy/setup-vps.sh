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
apt-get install -y -qq curl git ufw sqlite3 jq debian-keyring debian-archive-keyring apt-transport-https

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

# Let the admin's keys (used for root) also log in as the app user.
if [[ -f /root/.ssh/authorized_keys ]]; then
  sudo -u "${APP_USER}" mkdir -p "/home/${APP_USER}/.ssh"
  touch "/home/${APP_USER}/.ssh/authorized_keys"
  while IFS= read -r key; do
    grep -qF "${key}" "/home/${APP_USER}/.ssh/authorized_keys" || echo "${key}" >> "/home/${APP_USER}/.ssh/authorized_keys"
  done < /root/.ssh/authorized_keys
  chown -R "${APP_USER}:${APP_USER}" "/home/${APP_USER}/.ssh"
  chmod 600 "/home/${APP_USER}/.ssh/authorized_keys"
fi

# The app user may restart its own service (used by deploy.sh / CI) — nothing else.
echo "${APP_USER} ALL=(root) NOPASSWD: /usr/bin/systemctl restart powval" > /etc/sudoers.d/powval-deploy
chmod 440 /etc/sudoers.d/powval-deploy
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
# Daily backup email reports via Resend (see docs/deployment.md). Fill these in
# to enable; leave blank to skip email (backups still run).
# RESEND_API_KEY=
# BACKUP_EMAIL_TO=will.lehmann@powval.com
# BACKUP_EMAIL_FROM=PowVal Backups <backups@powval.com>
# Optional dead-man's-switch backstop:
# HEALTHCHECK_URL=https://hc-ping.com/your-uuid-here
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

# ── Timezone (so cron times are local, DST-safe) ─────────────────
timedatectl set-timezone Australia/Adelaide

# ── Daily DB backup (9:00pm Adelaide) ────────────────────────────
cat > /etc/cron.d/powval-backup <<CRON
0 21 * * * ${APP_USER} ${APP_DIR}/deploy/backup-db.sh >> /home/${APP_USER}/backups/backup.log 2>&1
CRON
sudo -u "${APP_USER}" mkdir -p "/home/${APP_USER}/backups"
chmod 644 /etc/cron.d/powval-backup

# ── CI deploy key (GitHub Actions auto-deploy) ───────────────────
# Command-restricted: a connection with this key can ONLY run deploy.sh.
CI_KEY="/home/${APP_USER}/.ssh/ci_deploy"
if [[ ! -f "${CI_KEY}" ]]; then
  sudo -u "${APP_USER}" ssh-keygen -t ed25519 -N "" -f "${CI_KEY}" -C "powval-ci" -q
fi
CI_PUB="$(cat "${CI_KEY}.pub")"
RESTRICT="command=\"/home/${APP_USER}/app/deploy/deploy.sh\",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty"
grep -qF "${CI_PUB}" "/home/${APP_USER}/.ssh/authorized_keys" || \
  echo "${RESTRICT} ${CI_PUB}" >> "/home/${APP_USER}/.ssh/authorized_keys"

echo ""
echo "== Done. Checks:"
echo "   curl -s http://127.0.0.1:3000/ | head -c 80   # app answers locally"
echo "   Then point DNS at this box (see docs/deployment.md) and Caddy"
echo "   will fetch the HTTPS certificate automatically."
echo ""
echo "== To enable auto-deploy on push (GitHub repo settings):"
echo "   1. Secrets and variables > Actions > New repository secret:"
echo "        VPS_HOST    = this server's IP"
echo "        VPS_SSH_KEY = the private key below (entire block, incl. BEGIN/END lines)"
echo "   2. Secrets and variables > Actions > Variables > New variable:"
echo "        DEPLOY_ENABLED = true"
echo "----------------------------------------------------------------------"
cat "${CI_KEY}"
echo "----------------------------------------------------------------------"
echo "   (This key can only trigger deploy.sh — it cannot open a shell.)"

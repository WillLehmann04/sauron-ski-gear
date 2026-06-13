# Deployment

Production runs on a small Sydney VPS behind Cloudflare:

```
Browser ──> Cloudflare (DNS + CDN + TLS edge) ──> Caddy (TLS origin, :443) ──> Node app (:3000)
```

- **VPS**: Ubuntu 24.04, Sydney region (DigitalOcean/Vultr), smallest tier is plenty.
- **Caddy**: reverse proxy with automatic Let's Encrypt certificates.
- **systemd**: keeps the Node app running (`powval.service`), restarts on crash/boot.
- **SQLite**: `data/powval.db` on the VPS disk; nightly backups, 14-day rotation.
- **Cloudflare**: DNS, CDN caching of static assets, DDoS front door.

Everything scriptable lives in `deploy/`:

| File | Purpose |
|---|---|
| `setup-vps.sh` | One-time provisioning of a fresh Ubuntu 24.04 box (idempotent) |
| `powval.service` | systemd unit installed by setup |
| `Caddyfile` | Reverse-proxy + HTTPS config installed by setup |
| `deploy.sh` | Pull latest main, install deps, restart, health-check |
| `backup-db.sh` | Nightly SQLite backup (cron-installed by setup) |

---

## First-time setup (runbook)

Every manual action, in order. Steps 1–5 are one-time; after that, deploys are
automatic on every push to `main`.

**Your actions at a glance:**

| # | Where | What you do |
|---|---|---|
| 1 | DigitalOcean | Create the Sydney droplet, note the IP |
| 2 | SSH (root) | Run `setup-vps.sh`; paste the **deploy key** it prints into GitHub; copy the **CI key** it prints at the end |
| 3 | GitHub | Add 2 Actions secrets + 1 variable (enables auto-deploy) |
| 4 | Cloudflare + registrar | Add domain, swap nameservers, DNS records grey→orange, SSL Full (strict) |
| 5 | Browser/SSH | Done-checks |

### 1. Create the VPS (manual, ~5 min)

1. DigitalOcean → Create Droplet → Region **Sydney (SYD1)** → Ubuntu 24.04 LTS →
   Basic / Regular → smallest tier (1GB) → add your SSH key → create.
2. Note the droplet's public IP.

### 2. Provision it (one command)

```bash
ssh root@<droplet-ip>
curl -fsSO https://raw.githubusercontent.com/WillLehmann04/sauron-ski-gear/main/deploy/setup-vps.sh
bash setup-vps.sh
```

(If the repo is private the `curl` 404s — copy the script up instead:
`scp deploy/setup-vps.sh root@<droplet-ip>:` from your machine, then `bash setup-vps.sh`.)

The script installs Node 22, Caddy, firewall (22/80/443 only), creates the `powval`
user, installs the systemd service, configures Caddy for `powval.com`, and schedules
nightly DB backups. It needs you twice:

1. **Mid-run it prints a deploy key** and pauses. Add it at GitHub → repo →
   Settings → **Deploy keys** → "Add deploy key" → paste → leave *write access*
   unchecked → add. Press Enter on the server to continue.
2. **At the end it prints a CI private key** (a `BEGIN OPENSSH PRIVATE KEY` block)
   plus instructions. Copy the whole block — you paste it into GitHub in step 3.

Sanity check when it finishes:

```bash
curl -s http://127.0.0.1:3000/ | head -c 100   # HTML from the app
```

### 3. Enable auto-deploy (GitHub, ~2 min)

GitHub repo → **Settings → Secrets and variables → Actions**:

1. Tab **Secrets** → "New repository secret":
   - Name `VPS_HOST`, value = the droplet IP.
   - Name `VPS_SSH_KEY`, value = the CI private key block from step 2 (entire thing,
     including the `BEGIN`/`END` lines).
2. Tab **Variables** → "New repository variable":
   - Name `DEPLOY_ENABLED`, value `true`.

From this moment every push to `main` deploys itself (watch the **Actions** tab).
To pause auto-deploys at any time, set `DEPLOY_ENABLED` to anything other than `true`.

### 4. Cloudflare (manual, ~10 min)

1. **Add the site**: Cloudflare dashboard → Add a domain → `powval.com` → Free plan.
2. **Nameservers**: at the domain registrar, replace the nameservers with the two
   Cloudflare assigns. (Propagation: minutes to a few hours.)
3. **DNS records** (Cloudflare → DNS):
   - `A` record, name `@`, value = droplet IP — **start with the grey cloud (DNS only)**.
   - `A` record (or CNAME to `@`), name `www`, value = droplet IP — grey cloud.
4. **Wait for HTTPS**: once DNS resolves to the droplet, Caddy obtains the Let's
   Encrypt certificate automatically. Verify `https://powval.com` loads with a padlock.
5. **Turn on the CDN**: flip both records to the **orange cloud (Proxied)**.
6. **Cloudflare SSL/TLS settings**:
   - SSL/TLS mode: **Full (strict)** — never "Flexible".
   - Edge Certificates → **Always Use HTTPS**: on.
7. Caching needs no extra config: Cloudflare respects the app's `Cache-Control`
   headers (30 days for `/images`, 1 hour for other static assets).

> Order matters: the grey-cloud step lets Caddy complete the Let's Encrypt challenge
> directly. Flipping to orange first can leave the origin certificate-less and the
> site erroring behind the proxy.

### 5. Done-check

- `https://powval.com` renders the landing page with a padlock.
- A test signup appears in the DB: `ssh powval@<ip> "sqlite3 ~/app/data/powval.db 'SELECT * FROM waitlist'"`.
- `systemctl status powval` shows active; reboot the droplet once and confirm the site
  comes back by itself.
- Auto-deploy works end to end: push any small commit to `main` (or re-run the latest
  workflow from the Actions tab) and confirm the run goes green and the change is live.

---

## Deploying updates

### Automatic (push to main)

`.github/workflows/deploy.yml` deploys on every push to `main`: it SSHes to the VPS
with a dedicated CI key and runs `deploy.sh`. The key is command-restricted in
`authorized_keys` — it can only trigger the deploy script, never open a shell.

One-time enablement is **step 3 of the runbook above** (two secrets + one variable).
Until `DEPLOY_ENABLED=true` is set, the workflow skips silently, so pushes before the
VPS exists don't produce failed runs. Deploy status appears next to each commit on GitHub.

### Manual (always available)

```bash
ssh powval@<droplet-ip> '~/app/deploy/deploy.sh'
```

Pulls, installs production deps, restarts the service, and health-checks. Rollback is
reverting the commit on `main` and letting auto-deploy run (or `git checkout
<previous-sha>` on the box + `deploy/deploy.sh` minus the pull).

## Production environment

`/home/powval/app/.env` on the VPS (created by setup, not in git):

```
PORT=3000
TRUST_PROXY_HOPS=2   # Cloudflare -> Caddy -> app; rate limiter needs real client IPs
```

## Operations

| Task | Command (on the VPS) |
|---|---|
| App logs | `journalctl -u powval -n 100 -f` |
| Restart app | `sudo systemctl restart powval` |
| Caddy logs | `journalctl -u caddy -n 50` |
| Inspect signups | `sqlite3 ~/app/data/powval.db 'SELECT COUNT(*) FROM waitlist'` |
| Backups | `ls ~/backups/` (nightly 3:15am, 14 kept, log in `~/backups/backup.log`) |
| Restore a backup | `gunzip -k powval-<date>.db.gz` → stop app → replace `data/powval.db` → start |

Test the restore path once after first deploy, not during an incident.

## Known gaps (deliberate, revisit at launch)

- No uptime monitoring yet — add a free pinger (UptimeRobot) on `https://powval.com` once live.
- Backups stay on the same disk — add a weekly offsite copy (object storage) before the estimator's comps data becomes valuable.
- The weekly comps-refresh cron lands here when the estimator ships (see `ml/task_outline.md` §10).

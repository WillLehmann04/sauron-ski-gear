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
user, prints a **deploy key** to add at GitHub → repo → Settings → Deploy keys
(read-only), clones the repo, installs the systemd service, configures Caddy for
`powval.com`, and schedules nightly DB backups. It pauses once, waiting for the deploy
key to be added.

Sanity check when it finishes:

```bash
curl -s http://127.0.0.1:3000/ | head -c 100   # HTML from the app
```

### 3. Cloudflare (manual, ~10 min)

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

### 4. Done-check

- `https://powval.com` renders the landing page with a padlock.
- A test signup appears in the DB: `ssh powval@<ip> "sqlite3 ~/app/data/powval.db 'SELECT * FROM waitlist'"`.
- `systemctl status powval` shows active; reboot the droplet once and confirm the site
  comes back by itself.

---

## Deploying updates

After merging to `main`:

```bash
ssh powval@<droplet-ip> '~/app/deploy/deploy.sh'
```

Pulls, installs production deps, restarts the service, and health-checks. Rollback is
`git checkout <previous-sha> && deploy/deploy.sh` minus the pull (or revert the commit
on main and deploy again).

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

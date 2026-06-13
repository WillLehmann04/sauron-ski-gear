# CLAUDE.md — What's My Gear Worth?

## Self-maintenance rule

**Documentation is part of "done," not an afterthought.** After any significant change — new feature, refactor, new module, changed command — update this file and the relevant doc in `docs/` in the same change. If a PR adds a route, `docs/` gets an update. If a script is added to `package.json`, the Run/Dev Commands section below gets an update.

## Commit and push rule

**After every feature is implemented and the user confirms they're happy with it, commit and push the changes.** This means: once the user signs off ("looks good", "ship it", "that's right", or equivalent confirmation), stage all related changes, write a descriptive commit message, and push to `main`. Do not wait to be asked — confirmation is the trigger.

---

## Project overview

**PowVal** (powval.com) is a web tool that estimates the resale value of used ski and snowboard gear. "What's My Gear Worth?" is its tagline. Users enter their gear details and get an instant estimate. A waitlist captures people who want to buy or sell gear through the platform when it launches.

---

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| Server | Express |
| Templating | EJS (server-rendered pages + partials + layouts) |
| Client interactivity | Vue 3 (CDN, mounted into EJS pages) |
| Storage | SQLite (`better-sqlite3`, `data/powval.db`) behind the swappable `lib/storage.js` interface |
| Config | `.env` via `dotenv` |
| Hosting | Sydney VPS + Caddy + systemd, Cloudflare in front (see `docs/deployment.md`) |

Keep other choices simple and swappable. Add dependencies deliberately.

---

## Directory structure

```
/
├── CLAUDE.md               ← this file; keep it current
├── .env                    ← secrets; never committed
├── .env.example            ← committed template
├── .gitignore
├── package.json
├── server.js               ← entry point; wires Express and mounts routes
│
├── routes/                 ← thin route handlers only; no business logic
│   ├── index.js            ← GET /
│   └── waitlist.js         ← POST /waitlist
│
├── services/               ← business logic; routes call services
│   └── waitlist.js         ← validation, dedup, orchestration
│
├── lib/                    ← shared utilities and abstractions
│   └── storage.js          ← storage interface (swap JSON ↔ SQLite without touching services)
│
├── ml/                     ← valuation model: requirements, data pipeline, eval (planning stage)
│   └── task_outline.md     ← full model requirements and phased delivery plan
│
├── views/
│   ├── layouts/
│   │   └── main.ejs        ← shared HTML shell (head, nav, footer)
│   ├── partials/           ← reusable EJS snippets included by pages
│   └── index.ejs           ← landing / waitlist page
│
├── public/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── components/
│           └── WaitlistForm.js  ← Vue component (ES module, no build step)
│
├── data/
│   └── powval.db           ← SQLite: waitlist + shops tables; gitignored
│
├── deploy/                 ← production deployment kit (VPS setup, systemd, Caddy, backups)
│
└── docs/
    ├── README.md           ← docs index
    └── waitlist.md         ← waitlist feature spec and API contract
```

**What belongs where:**

- **`routes/`** — Express router files. Each file owns one resource. Handlers read `req`, call a service, and send `res`. No logic beyond that.
- **`services/`** — All business logic. Validate input, enforce rules (dedup, formatting), call `lib/` for storage. Must not know about `req`/`res`.
- **`lib/`** — Pure utilities and thin interfaces. `storage.js` exposes `read(collection)` / `write(collection, data)` so the backing store can be swapped.
- **`views/`** — EJS only. Layouts wrap pages; partials are reused fragments. No business logic in templates.
- **`public/`** — Static assets served as-is. Vue components live here as ES modules (no build step required for now).
- **`data/`** — Runtime data. `powval.db` (SQLite) holds the `waitlist` and `shops` tables (separate collections so the two demand signals stay independent). Gitignored; keep a `.gitkeep` to preserve the directory.
- **`deploy/`** — Production deployment kit: `setup-vps.sh` (one-time provisioning), `powval.service` (systemd), `Caddyfile`, `deploy.sh` (update + restart), `backup-db.sh` (nightly cron). Documented in `docs/deployment.md`.
- **`.github/workflows/`** — CI. `deploy.yml` auto-deploys `main` to the VPS over SSH (gated on the `DEPLOY_ENABLED` repo variable; see `docs/deployment.md`).
- **`ml/`** — The valuation model workspace: requirements (`task_outline.md`), and later the data-spike scripts, parser eval sets, and model evaluation harness. Request-path estimator code still lives in `routes/` + `services/` like everything else; `ml/` holds the offline/model side.
- **`docs/`** — One Markdown file per feature/module. `docs/README.md` is the index. Keep in sync with code.

---

## Coding conventions

### DRY / reuse
No copy-pasted logic. Shared logic goes in `services/` or `lib/`; shared UI goes in EJS partials or reusable Vue components. Prefer composing small, focused functions.

### Single responsibility
Each module does one thing. Routes route. Services validate and orchestrate. Storage reads and writes. Keep files small and names obvious.

### Naming
- Files and directories: `kebab-case`
- JS variables and functions: `camelCase`
- Vue components: `PascalCase`
- EJS partials: `kebab-case.ejs`

### Separation of concerns
Routes are thin — they translate HTTP to function calls and back. Business logic lives in `services/`. Data access is isolated in `lib/storage.js` so the backing store can change without touching service code.

### Input validation
Validate all external input at the route boundary (using the service). Return explicit, descriptive errors. Never trust `req.body` without checking it.

### Error handling
Handle errors explicitly — no silent swallows. Services throw or return `{ ok: false, error }`. Routes translate that to HTTP status codes.

### Config and secrets
All config and secrets via `.env` loaded by `dotenv`. Never hardcode values. Commit `.env.example` with placeholder values. `.gitignore` must include `.env` and `data/*.json` if the data is sensitive.

---

## Documentation rules

- Every feature and significant module gets a doc in `docs/`.
- `docs/README.md` is the index — link every doc from it.
- Docs describe the *what* and *why*, not the code line-by-line.
- Update docs in the same commit as the code change.

---

## Run / dev commands

```bash
npm install          # install dependencies
npm run dev          # start server with nodemon (auto-reload)
npm start            # start server (production)
```

> Update this section whenever scripts change in `package.json`.

# Waitlist Feature

Captures signups from two distinct audiences who want PowVal when it launches:

- **Consumers** — skiers who want to buy or sell their own gear (hero + main form).
- **Ski shops** — retailers who want bulk trade-in/inventory pricing ("For ski shops" band).

The two audiences are stored in **separate collections** so demand can be measured independently.

---

## User flow

1. User visits `/` (the landing page).
2. Three Vue forms render, all from the same `WaitlistForm` component:
   - The hero inline form (`#hero-form`, `variant: 'inline'`) — **email** only, single-row capture above the fold (kept minimal for conversion). Until Vue mounts (or if the CDN fails), the container holds a plain "Get early access" link to `#join` as a fallback.
   - The consumer form (`#waitlist-app`) — **your name** (optional) + **email**.
   - The shop form (`#shop-app`, `audience: 'shop'`) — **shop name** + **contact name** (optional) + **work email**.
3. Vue handles client-side validation and submits to `POST /waitlist` via `fetch`, including a `type` field.
4. On success the form is replaced by a confirmation message (announced via `role="status"` for screen readers). A repeat signup is also treated as success — the confirmation acknowledges "you're already on the list" instead of showing an error. A "Wrong email? Re-enter it" button on the confirmation returns to the form (email preserved, input focused) so typos can be corrected.
5. On validation error (invalid email, missing shop name) an inline error message is shown without a page reload, with the failing input highlighted and wired up via `aria-invalid` / `aria-describedby`.

A successful **new consumer** signup also triggers a branded welcome email — see [Welcome email](#welcome-email-b2c) below.

---

## API contract

### `POST /waitlist`

**Request body** (JSON):

```json
{
  "email": "user@example.com",
  "name": "Ada Lovelace",
  "type": "consumer",
  "shopName": "Powder House Skis"
}
```

- `email` — required, validated, max 254 chars.
- `type` — `"consumer"` (default) or `"shop"`. Routes the signup to the matching collection.
- `name` — optional, capped at 80 chars. Collected by both card forms ("Your name" for consumers, "Contact name" for shops); empty for hero inline signups.
- `shopName` — required when `type` is `"shop"` (capped at 120 chars), ignored otherwise.
- `hp` — honeypot. A hidden field humans never fill. If non-empty, the request is treated as a bot: the API returns `{ ok: true }` but **nothing is stored**, keeping demand data clean.

Non-string values for any field are coerced to `''` before validation, so malformed JSON bodies produce a 422, never a 500.

**Success — 201 Created:**
```json
{ "ok": true }
```

**Already on the list — 200 OK** (treated as success, not an error — the user's goal is already met; nothing is re-stored):
```json
{ "ok": true, "duplicate": true }
```

**Validation error — 422 Unprocessable Entity:**
```json
{ "ok": false, "error": "Invalid email address." }
```
```json
{ "ok": false, "error": "Shop name is required." }
```

**Rate limited — 429 Too Many Requests:**
```json
{ "ok": false, "error": "Too many requests. Please try again in a minute." }
```

Duplicates are checked **per collection** — the same email may exist once on the consumer list and once on the shop list.

`POST /waitlist` is rate limited to **8 requests per minute per IP** (in-memory, set in `server.js`). Combined with the honeypot, this keeps automated signups from polluting the demand data.

---

## Storage format

Signups are persisted in **SQLite** (`data/powval.db`, WAL mode, via `better-sqlite3`)
behind the same `lib/storage.js` `read(collection)` / `write(collection, data)`
interface the JSON files used — the swap touched no service code.

Two tables, one per collection:

| Table | Columns |
|---|---|
| `waitlist` | `email`, `name`, `createdAt` |
| `shops` | `email`, `name`, `shopName`, `createdAt` |

On first startup after the migration, any legacy `data/waitlist.json` / `data/shops.json`
rows are imported once and the files renamed to `*.json.imported` (kept as a manual
rollback, never deleted). The DB and imported files are gitignored.

Inspect signups directly:

```bash
sqlite3 data/powval.db 'SELECT * FROM waitlist'
```

In production the DB is backed up nightly with 14-day rotation (see
[deployment.md](./deployment.md)).

---

## Welcome email (B2C)

When a **new consumer** joins the waitlist, the app sends them a branded welcome email. Consumer-only — shops are a separate audience and don't receive it.

- **Trigger:** a successful *new* consumer signup in `services/waitlist.js`. Honeypot hits and duplicates never trigger it (a repeat signup means they were already welcomed).
- **Best-effort & non-blocking:** the send is fire-and-forget — the HTTP response never waits on Resend, and any failure is logged, never surfaced to the user. A signup succeeds even if email is down or unconfigured.
- **Transport:** `lib/email.js` posts to the same Resend REST endpoint and reuses the same `RESEND_API_KEY` as the nightly backup report (`deploy/backup-db.sh`). No key (or no sender) → the welcome email is silently disabled; signups still work.
- **Template:** `emails/templates/waitlist-welcome.hbs` (Handlebars), rendered with `{ name }`. Cohesive dark "Night Mountain" design top to bottom. Imagery is raster-only and referenced by absolute URL (the brand SVGs don't render in email clients); the hero is a pre-rendered scene at `public/images/email-hero.jpg` (JPEG q90, ~94 KB — down from a 360 KB PNG; the baked Barlow headline stays crisp), and the header logo uses a right-sized `powval-icon-60.png` (~4 KB). A plain-text alternative ships alongside the HTML for deliverability.

### Config (`.env`)

| Var | Needed | Purpose |
|---|---|---|
| `RESEND_API_KEY` | to send | Resend API key. Shared with the backup report. Unset = welcome email off. |
| `WAITLIST_EMAIL_FROM` | to send | Sender, e.g. `powval <no-reply@powval.com>`. The domain must be verified in Resend (powval.com already is). Unset = welcome email off. |
| `WAITLIST_EMAIL_REPLY_TO` | optional | Where replies route, since `no-reply@` isn't monitored. |
| `RESEND_API_URL` | optional | Override the Resend endpoint (defaults to `https://api.resend.com/emails`). |

To turn it on in production, set `WAITLIST_EMAIL_FROM` and make sure `RESEND_API_KEY` is set.

---

## Module map

| File | Role |
|---|---|
| `routes/waitlist.js` | Thin route handler — reads `req.body`, calls service, sends `res` |
| `services/waitlist.js` | Validates input, routes to the consumer/shop collection, checks duplicates, writes via storage, fires the consumer welcome email |
| `services/waitlist-email.js` | Renders `waitlist-welcome.hbs` and sends the B2C welcome via `lib/email.js` (consumer-only, best-effort) |
| `lib/email.js` | Shared Resend transport — best-effort `send()`; reuses `RESEND_API_KEY`, never throws into the request path |
| `lib/storage.js` | Generic per-collection read/write interface (`waitlist`, `shops`) |
| `emails/templates/waitlist-welcome.hbs` | Handlebars welcome email; cohesive dark "Night Mountain" design, hero (`public/images/email-hero.jpg`) |
| `views/index.ejs` | Landing page shell; mounts all three Vue form instances |
| `public/js/components/WaitlistForm.js` | Vue component — `audience` prop drives fields/copy, `variant: 'inline'` renders the compact hero layout; form state, validation, fetch, success/error UI |

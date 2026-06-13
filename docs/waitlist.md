# Waitlist Feature

Captures signups from two distinct audiences who want PowVal when it launches:

- **Consumers** — skiers who want to buy or sell their own gear (hero + main form).
- **Ski shops** — retailers who want bulk trade-in/inventory pricing ("For ski shops" band).

The two audiences are stored in **separate collections** so demand can be measured independently.

---

## User flow

1. User visits `/` (the landing page).
2. Three Vue forms render, all from the same `WaitlistForm` component:
   - The hero inline form (`#hero-form`, `variant: 'inline'`) — **email** only, single-row capture above the fold. Until Vue mounts (or if the CDN fails), the container holds a plain "Get early access" link to `#join` as a fallback.
   - The consumer form (`#waitlist-app`) — **email** only.
   - The shop form (`#shop-app`, `audience: 'shop'`) — **shop name** + **work email**.
3. Vue handles client-side validation and submits to `POST /waitlist` via `fetch`, including a `type` field.
4. On success the form is replaced by a confirmation message (announced via `role="status"` for screen readers). A repeat signup is also treated as success — the confirmation acknowledges "you're already on the list" instead of showing an error. A "Wrong email? Re-enter it" button on the confirmation returns to the form (email preserved, input focused) so typos can be corrected.
5. On validation error (invalid email, missing shop name) an inline error message is shown without a page reload, with the failing input highlighted and wired up via `aria-invalid` / `aria-describedby`.

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
- `name` — optional (consumer), capped at 80 chars.
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

Signups are persisted as JSON arrays in two files via `lib/storage.js`:

- **`data/waitlist.json`** — consumer signups.
- **`data/shops.json`** — shop signups (adds `shopName`).

```json
// data/shops.json
[
  {
    "email": "owner@powderhouse.com",
    "name": "",
    "shopName": "Powder House Skis",
    "createdAt": "2026-06-10T00:00:00.000Z"
  }
]
```

The storage layer (`lib/storage.js`) abstracts reads and writes per collection, so the backing store can be replaced with SQLite or another store without touching the service. Both files are gitignored.

---

## Module map

| File | Role |
|---|---|
| `routes/waitlist.js` | Thin route handler — reads `req.body`, calls service, sends `res` |
| `services/waitlist.js` | Validates input, routes to the consumer/shop collection, checks duplicates, writes via storage |
| `lib/storage.js` | Generic per-collection read/write interface (`waitlist`, `shops`) |
| `views/index.ejs` | Landing page shell; mounts all three Vue form instances |
| `public/js/components/WaitlistForm.js` | Vue component — `audience` prop drives fields/copy, `variant: 'inline'` renders the compact hero layout; form state, validation, fetch, success/error UI |

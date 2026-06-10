# Waitlist Feature

Captures signups from two distinct audiences who want GearWorth when it launches:

- **Consumers** — skiers who want to buy or sell their own gear (hero + main form).
- **Ski shops** — retailers who want bulk trade-in/inventory pricing ("For ski shops" band).

The two audiences are stored in **separate collections** so demand can be measured independently.

---

## User flow

1. User visits `/` (the landing page).
2. Two Vue forms render, both from the same `WaitlistForm` component:
   - The consumer form (`#waitlist-app`) — **email** only.
   - The shop form (`#shop-app`, `audience: 'shop'`) — **shop name** + **work email**.
3. Vue handles client-side validation and submits to `POST /waitlist` via `fetch`, including a `type` field.
4. On success the form is replaced by a confirmation message.
5. On error (duplicate, invalid email, missing shop name) an inline error message is shown without a page reload.

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

- `email` — required, validated.
- `type` — `"consumer"` (default) or `"shop"`. Routes the signup to the matching collection.
- `name` — optional (consumer).
- `shopName` — required when `type` is `"shop"`, ignored otherwise.

**Success — 201 Created:**
```json
{ "ok": true }
```

**Validation error — 422 Unprocessable Entity:**
```json
{ "ok": false, "error": "Invalid email address." }
```
```json
{ "ok": false, "error": "Shop name is required." }
```

**Duplicate — 409 Conflict:**
```json
{ "ok": false, "error": "This email is already on the list." }
```

Duplicates are checked **per collection** — the same email may exist once on the consumer list and once on the shop list.

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
| `views/index.ejs` | Landing page shell; mounts both Vue form instances |
| `public/js/components/WaitlistForm.js` | Vue component — `audience` prop drives fields/copy; form state, validation, fetch, success/error UI |

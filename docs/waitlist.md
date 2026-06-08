# Waitlist Feature

Captures email signups from people who want to buy or sell ski/snowboard gear when the platform launches.

---

## User flow

1. User visits `/` (the landing page).
2. A Vue component renders a form with two fields: **email** (required) and **name** (optional).
3. Vue handles client-side validation and submits to `POST /waitlist` via `fetch`.
4. On success the form is replaced by a confirmation message.
5. On error (duplicate, invalid email) an inline error message is shown without a page reload.

---

## API contract

### `POST /waitlist`

**Request body** (JSON):
```json
{
  "email": "user@example.com",
  "name": "Ada Lovelace"
}
```

**Success — 201 Created:**
```json
{ "ok": true }
```

**Validation error — 422 Unprocessable Entity:**
```json
{ "ok": false, "error": "Invalid email address." }
```

**Duplicate — 409 Conflict:**
```json
{ "ok": false, "error": "This email is already on the waitlist." }
```

---

## Storage format

Signups are persisted in `data/waitlist.json` as a JSON array:

```json
[
  {
    "email": "user@example.com",
    "name": "Ada Lovelace",
    "createdAt": "2026-06-08T00:00:00.000Z"
  }
]
```

The storage layer (`lib/storage.js`) abstracts reads and writes so this can be replaced with SQLite or another store without touching the service.

---

## Module map

| File | Role |
|---|---|
| `routes/waitlist.js` | Thin route handler — reads `req.body`, calls service, sends `res` |
| `services/waitlist.js` | Validates email, checks for duplicates, writes via storage |
| `lib/storage.js` | Generic read/write interface backed by `data/waitlist.json` |
| `views/index.ejs` | Landing page shell; mounts the Vue component |
| `public/js/components/WaitlistForm.js` | Vue component — form state, validation, fetch, success/error UI |

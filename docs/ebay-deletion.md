# eBay Marketplace Account Deletion endpoint

eBay requires every app with API production access to host an endpoint that
receives **Marketplace Account Deletion/Closure** notifications, so apps can
erase data about users who delete their eBay account. Without a *validated*
endpoint, eBay won't grant production API access (including the Marketplace
Insights API — see [`../ml/task_outline.md`](../ml/task_outline.md)).

PowVal stores **no eBay user data** (only aggregate comps and our own waitlist),
so there's nothing to erase — but eBay still requires the endpoint to exist and
pass validation.

## Endpoint

Mounted at **`/deletion`** (`routes/ebay-deletion.js` → `services/ebay-deletion.js`), and **not rate-limited** so eBay's traffic always gets through.

| Method | Purpose | Response |
|---|---|---|
| `GET /deletion?challenge_code=…` | eBay's one-time validation handshake | `200` `{ "challengeResponse": "<hex>" }` |
| `POST /deletion` | An actual account-deletion notification | `200` (acknowledged; nothing to erase) |

The handshake response is `sha256hex(challengeCode + verificationToken + endpoint)` — the three values concatenated in that exact order, per eBay's spec. The token and endpoint come from config so they can match the portal exactly.

## Config (`.env`)

Both must **exactly** match the values entered in the eBay developer portal (Alerts & Notifications) — a trailing slash or `http`/`https` mismatch fails validation:

```bash
EBAY_DELETION_VERIFICATION_TOKEN=<your 32–80 char token from the portal>
EBAY_DELETION_ENDPOINT=https://powval.com/deletion
```

## Turning it on

1. Set both env vars in the production `.env` (`/home/powval/app/.env`).
2. Restart: `sudo systemctl restart powval`.
3. In the eBay portal, (re)enter the endpoint + token and click **Save** — eBay sends the GET handshake; a correct `challengeResponse` validates it.

## Tests

`services/ebay-deletion.test.js` (run with `npm test`) checks the challenge hash against a known-good vector and the unconfigured-error path.

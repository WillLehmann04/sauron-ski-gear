# eBay Marketplace Insights API — Access Application (PowVal)

**Purpose:** request access to the **Marketplace Insights API** (Limited Release) for `EBAY_AU`, to power aggregate resale-value estimates for used ski/snowboard gear.

**How to submit:** in your eBay Developer dashboard, request Marketplace Insights / Buy-API production access (Limited Release — it's a use-case review, not a self-serve toggle). Paste the answers below into the application fields. The exact field labels vary; map them by topic.

> **Will — fill/confirm the `[FILL: …]` items before submitting.** Everything else is drafted for you.

---

## 1. Applicant & app

| Field | Answer |
|---|---|
| Company / trading name | PowVal — "What's My Gear Worth?" |
| Legal entity | `[FILL: sole trader / Pty Ltd name + ABN if registered, else "individual sole trader, AU"]` |
| Website | https://powval.com |
| Primary contact | `[FILL: name + email — e.g. will@powval.com]` |
| Production App ID (keyset) | `[FILL: your production App ID from the dashboard]` |
| API requested | Marketplace Insights API (`buy.marketplace.insights`) |
| Marketplace | EBAY_AU (Australia) |

## 2. Business model

PowVal is a free consumer web tool that gives skiers and snowboarders a realistic resale-value estimate for their used gear, grounded in what comparable items actually sold for. It is **not** a marketplace and does **not** resell goods or relist eBay inventory. Near-term it is unmonetised (audience building via a waitlist); longer term, a separate buy/sell feature is planned. The product's entire value is *credibility of the number*, which is why licensed sold-price data matters to us rather than guesswork.

## 3. Use case for Marketplace Insights data

We use the 90-day **sold-item** price history to compute, per gear model, an **aggregate** resale range:
- Recency-weighted **median** sold price → the "expected" value.
- Weighted 25th/75th percentiles → a low–high range.
- Adjusted for item condition, length/size, and bindings-included, using our own model.

This runs as a **weekly batch job**, not in the user request path. We aggregate by `{category, brand, model, year, length}` and store derived per-model statistics. Individual user requests read only those precomputed aggregates — we never call eBay live per user.

## 4. How eBay data is displayed (compliance)

We display **only aggregate, derived statistics** — a price *range* and a count such as "based on 47 recent sales (last 90 days)." We do **not**:
- reproduce or list individual sold listings, titles, prices, images, or seller data to end users;
- expose the raw API response;
- present eBay sold data as anything other than aggregated market context.

We will read and honour the Marketplace Insights API display/usage restrictions in full, and constrain the UI to what the terms permit. `[FILL: confirm after reading the MI API License Agreement — note any per-term display limits here.]`

## 5. Expected call volume

Low and bounded. A weekly aggregation job queries sold-item history for our supported catalog (initially ~a few hundred ski/snowboard models, AU only):
- Estimated **~1,000–5,000 calls/week** at launch (one pass per supported model, paginated), run off-peak.
- No live per-user calls; results are cached and refreshed weekly.
- `[FILL: confirm these numbers are acceptable to you; we can throttle lower if required.]`

## 6. Data handling

- Sold-price data is fetched weekly, aggregated, and stored as **derived per-model statistics** in a private SQLite database on our AU (Sydney) VPS.
- Raw responses are retained privately for internal model calibration only and are **never displayed**.
- No personal data from listings is used or stored.
- Caching/refresh cadence respects API terms; we will adjust retention to whatever the MI License Agreement requires. `[FILL: confirm retention limits after reading the agreement.]`

## 7. Why us / why now

We are at pre-launch with a working site and a waitlist; the estimator is the core feature. We have deliberately built the request path to read only precomputed aggregates (no live API calls per user), which keeps our call volume low and our usage squarely within an aggregate-insights use case — exactly what Marketplace Insights is for.

---

### Submission checklist (Will)
- [ ] Fill every `[FILL: …]` above.
- [ ] Read the **Marketplace Insights API License Agreement**; record any display/retention limits in §4 and §6.
- [ ] Confirm your **production keyset** exists (App ID/Cert ID/Dev ID) — required to be granted the API.
- [ ] Submit; note the application/reference ID and date here: `[FILL: ref + date]`.
- [ ] While waiting: request **Browse API** access for active-listing (asking-price) data — usable as a secondary signal now (task_outline §5.1).

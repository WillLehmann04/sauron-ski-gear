# PowVal Valuation Model — Task Outline

Requirements for the estimator that powers "What's My Gear Worth?": every aspect of the
model, its data, its serving path, and the order to build it in.

**Status:** planning. Nothing in this directory ships yet.
**Owner:** Will. **Last updated:** 2026-06-13.

---

## 1. Goal

Given a piece of ski/snowboard gear and its condition, return a realistic AU resale
range grounded in what comparable items actually sold for — not asking prices.

A skier who knows gear should look at the output and think "yeah, that's about right."
Credibility is the product; a wrong-but-confident number is worse than no number.

### Success criteria (v1 launch gate)

| Criterion | Target |
|---|---|
| Range coverage | ≥ 80% of held-out actual sales fall inside the low–high range |
| Point accuracy | Median absolute % error (MdAPE) of the expected price ≤ 20% |
| Coverage | ≥ 70% of estimate requests for the supported catalog return a comps-backed answer (not the fallback curve) |
| Latency | < 300ms for a catalog-matched request (precomputed/cached), < 2s worst case |
| Expert sniff test | Founder + 2 gear-literate skiers agree the numbers are plausible across 20 spot checks |

---

## 2. Decisions (locked 2026-06-13)

| Decision | Choice | Consequence |
|---|---|---|
| Hosting | Small Sydney VPS (DigitalOcean/Vultr SYD) | Persistent disk → SQLite + files are safe; weekly job is plain cron; Python sidecar possible later |
| Data sourcing | Apply for eBay Marketplace Insights API now; throttled scrape spike on eBay AU sold listings in parallel | Model work doesn't block on eBay partner review; ToS risk contained to the spike (see §11) |
| Model stack | Phased: v0 heuristic in Node (in the existing Express app) → v1 Python sidecar only if it beats v0 on held-out data | No new runtime until the data proves it's worth it |
| v1 scope | Skis + snowboards, AU region only | Matches the landing-page promise; boots/bindings/outerwear deferred |

### Open decisions

- **Scrape tooling** for the spike (plain fetch + parsing vs headless browser) — decide in Phase 0 based on what eBay AU serves.
- **Whether estimates are logged with user identity** (privacy implications, §11) — decide before public launch.
- **Catalog seeding method** — manual CSV vs scripted scrape of spec sites (§5.3) — decide in Phase 1.

---

## 3. Product requirements

### Inputs (the "six factors" already promised on the landing page)

| Field | Type | Required | Notes |
|---|---|---|---|
| `category` | `ski` \| `snowboard` | yes | v1 scope |
| `brand` | string | yes | normalized against catalog aliases (e.g. "salmon" → Salomon) |
| `model` | string | yes | fuzzy-matched against catalog (e.g. "qst92" → QST 92) |
| `year` | int | yes | model year; accept season strings ("21/22") and normalize |
| `lengthCm` | int | yes | ski length / board length |
| `condition` | enum | yes | 5-point rubric, §4 |
| `bindings` | bool | no | included or not; default false |
| `region` | string | fixed `AU` in v1 | schema-ready for expansion |

### Outputs

```json
{
  "low": 280,
  "expected": 420,
  "high": 560,
  "currency": "AUD",
  "confidence": "high",        // high | medium | low — see §6.3
  "compsUsed": 47,
  "windowDays": 90,
  "method": "comps",           // comps | depreciation-fallback
  "catalogMatch": { "brand": "Salomon", "model": "QST 92", "year": 2021 },
  "lastUpdated": "2026-06-08T00:00:00Z"
}
```

The hero panel's demo copy ("47 AU sold prices · last 90 days") is the contract: every
number shown to the user must be backed by these fields.

### Non-goals (v1)

- No buy/sell marketplace mechanics (separate feature).
- No price *prediction over time* ("sell in July for more") — seasonality only adjusts the current estimate.
- No photo-based intake or image-based condition grading in v1 — typed brand/model entry with catalog autocomplete is the launch flow. Photo intake is a designed-for future feature (§14); v1 must not preclude it.
- No regions outside AU.

---

## 4. Condition rubric

The estimate is only as good as the condition input. Define once, use everywhere
(form copy, comps parsing, model features):

| Grade | Label | Definition |
|---|---|---|
| 5 | New / unused | Never mounted/ridden, may have shop stickers |
| 4 | Like new | < 5 days use, no base or topsheet damage |
| 3 | Good | Normal season's wear: light topsheet chips, base scratches that don't reach core, edges intact |
| 2 | Fair | Multiple seasons: deeper base gouges (repaired), edge burrs, heavy topsheet wear |
| 1 | Well used | Core shots, de-lams repaired, rusted edges — functional but tired |

Requirement: map free-text condition phrases found in listing titles/descriptions onto
this scale during parsing (§5.4), and present the same rubric to users in the estimate form.

---

## 5. Data requirements

### 5.1 Sources

**Primary (pending): eBay Marketplace Insights API.** Partner-gated; gives 90 days of
sold-price history. Action: submit the eBay Developers Program application for the
Marketplace Insights API immediately (Phase 0 task) — approval can take weeks and may
be rejected; the spike below de-risks that.

**Bridge: throttled scrape spike of eBay AU sold/completed listings.** Purpose is
validation, not production: collect enough sold listings to (a) prove the parsing
pipeline, (b) calibrate the v0 heuristic, (c) measure comp volumes per model. Constraints
in §11.

**Secondary signal: eBay Browse API (standard developer access).** Active listings =
asking prices. Never used as a sale price; used for market-liquidity features ("how many
of these are for sale right now") and as a sanity ceiling.

**Manual fallback: Terapeak** (via an eBay seller account) for spot-checking model
outputs against eBay's own sold-data UI during evaluation.

### 5.2 Comps store (SQLite)

Table `comps` — one row per sold listing:

| Column | Notes |
|---|---|
| `id` | source listing id, unique with `source` |
| `source` | `mi-api` \| `scrape` \| `manual` |
| `titleRaw` | original listing title |
| `category`, `brand`, `model`, `year`, `lengthCm` | parsed, nullable where parse failed |
| `conditionGrade` | 1–5 per §4, nullable |
| `bindingsIncluded` | bool, nullable |
| `priceSold`, `currency`, `shipping` | sale economics |
| `soldAt` | date sold |
| `region` | `AU` |
| `url` | provenance |
| `parseConfidence` | 0–1; low-confidence rows excluded from estimates |
| `fetchedAt` | pipeline bookkeeping |

Requirements: idempotent upserts (re-running the job never duplicates), parse versioning
(re-parse old raw titles when the parser improves), raw titles kept forever (they're the
training data), 90-day rolling window for estimates but no deletion.

### 5.3 Gear catalog (SQLite)

Reference table of real models so user input and listing titles resolve to the same
entity: `catalog(brand, model, aliases[], category, years[], lengthsCm[], msrpAud, tier)`.

- Seed: top ~50 ski + ~30 snowboard brands sold in AU; the few hundred models that
  dominate the secondhand market (QST, Mantra, Enforcer, Bent, Rustler, Custom,
  Process, ...). Sources: manufacturer archives, evo/Blister spec pages, AU retailer ranges.
- `tier` (budget/mid/premium/race) is a model feature and fallback-curve input.
- `msrpAud` required for the depreciation fallback (§6.2).
- Requirement: a maintenance path for adding models each season (CSV import script).

### 5.4 Title parsing / entity resolution

The actual hard problem: "2021 Salomon QST 92 169cm skis w/ Warden bindings GREAT COND"
→ structured comp row.

- v0: deterministic — catalog-driven brand/model alias matching, regex for year/length,
  keyword map for condition (§4) and bindings. Target: ≥ 80% of listings parsed with
  high confidence; the rest flagged, not guessed.
- v1 option: LLM-assisted extraction for the long tail (batch, offline, during the
  weekly job — never in the request path). Cost-capped and evaluated against a
  hand-labeled set of 200 titles before adoption.
- Every parser change re-runs over stored raw titles and is diffed against the previous
  parse (regression check).

### 5.5 Refresh pipeline

- `jobs/refresh-comps.js`, run weekly by cron on the VPS (the landing page already
  promises "refreshed every week").
- Steps: fetch new sold listings (per source adapter) → parse → upsert → recompute
  per-model aggregates → write `data/model-stats` snapshot → log a run report.
- Failure behavior: job failure never breaks the site; estimates serve from the last
  good snapshot with `lastUpdated` honestly reflecting it.
- Volume expectation to validate in Phase 0: roughly 1–5k AU ski/snowboard sold
  listings per 90-day window (unknown — measuring this is a Phase 0 deliverable).

---

## 6. Model requirements

### 6.1 v0 — comps heuristic (Node, ships first)

1. **Match tiering.** Find comps for the requested gear at the tightest tier that has
   enough data: (a) exact model+year ± same length bucket → (b) exact model, any year,
   age-adjusted → (c) same brand + tier + category, age-adjusted. Tier used is reported
   via `confidence`.
2. **Estimate.** Recency-weighted median of matched comp prices = `expected`;
   `low`/`high` = weighted 25th/75th percentile, widened when n is small.
3. **Adjustments** (multiplicative, calibrated from data once the spike lands, hardcoded
   sensible priors before that): condition grade, bindings included, length-mismatch
   penalty, seasonality (§6.4).
4. **Floor/ceiling sanity:** never above live asking-price median (Browse signal), never
   below scrap value (~AU$20).

### 6.2 Fallback — depreciation curve

When comps < minimum (e.g. n < 5 at every tier): estimate from `msrpAud` with a
per-category age-decay curve (e.g. retain ~55% year 1, −10pp/year after, floored),
condition-adjusted. Always labeled `method: "depreciation-fallback"` and
`confidence: "low"` — the UI must visibly distinguish this from comps-backed numbers.

### 6.3 Confidence

`high`: ≥ 15 comps at tier (a)/(b) and IQR/median < 0.5.
`medium`: ≥ 5 comps any tier.
`low`: fallback curve or wide dispersion.
Requirement: confidence maps to explicit UI copy (e.g. "based on 47 recent sales" vs
"rough estimate — few recent sales of this model").

### 6.4 Seasonality

AU secondhand prices swing with the season (peak autumn/early winter, trough spring).
v0: monthly multiplier table estimated from comps once ≥ 6 months of data exists;
identity multiplier until then. Document the assumption in the UI ("prices typically
peak before the season").

### 6.5 v1 — trained model (Python sidecar, earn its place)

- Candidate: gradient-boosted regression (price | features: model embedding/one-hot,
  age, length delta, condition, bindings, tier, month, liquidity).
- Graduation gate: beats v0 on the §7 metrics on held-out data by a margin that matters
  (≥ 3pp MdAPE improvement or ≥ 5pp range-coverage improvement). If it can't, v0 stays.
- Serving: separate Python process on the same VPS (FastAPI/uvicorn on localhost), Node
  calls it; Node-side fallback to v0 if the sidecar is down.

---

## 7. Evaluation requirements

- **Holdout protocol:** time-based split — train/calibrate on sales up to date T,
  evaluate on sales after T (never random split; leakage via duplicate listings).
- **Metrics:** MdAPE and MAPE of `expected`; range coverage (% of actual sale prices
  within [low, high]); range width (coverage is gameable by huge ranges — report both);
  fallback rate; per-category and per-brand-tier slices.
- **Regression gate:** any change to parser, adjustments, or model must not worsen
  MdAPE/coverage on the frozen eval set; the eval runs as a script (`ml/eval/`) with a
  one-line pass/fail summary.
- **Human checks:** 20-item spot-check sheet per release (founder + 2 gear-literate
  skiers), recorded in the repo.

---

## 8. Serving & integration

- **Endpoint:** `POST /api/estimate` on the existing Express app — thin route →
  `services/estimate.js` (same conventions as the waitlist: routes thin, logic in
  services, storage behind `lib/`).
- **Request path never scrapes or hits eBay live.** Estimates read precomputed
  per-model aggregates from SQLite; worst case computes from local comps rows.
- **Caching:** in-process LRU keyed by normalized input; invalidated by the weekly job.
- **Rate limiting:** reuse the existing limiter (stricter bucket, e.g. 20/min/IP).
- **Validation:** same hardening pattern as the waitlist service (type-coerce, length caps, 422s).
- **UI:** the landing page's hero panel becomes the real estimator at launch; the
  output contract (§3) feeds it without redesign. Estimate page is a later, separate
  frontend task — out of scope for this outline.

---

## 9. Storage plan

- Graduate `lib/storage.js` to SQLite (`better-sqlite3`) behind the existing
  `read/write` interface, extended with query methods needed by comps
  (`findComps(filters)`, `upsertComps(rows)`); waitlist collections migrate to tables
  in the same DB file at the same time (closes the "Mongo?" question: SQLite on the
  VPS's persistent disk).
- Single DB file `data/powval.db`, nightly `sqlite3 .backup` to a second disk location +
  weekly offsite copy (object storage). Backup restore is tested once, not assumed.
- `data/*.json` remains supported during migration; cutover is one storage-module swap.

---

## 10. Ops requirements (Sydney VPS)

- Node app under systemd (or pm2), Caddy in front for auto-HTTPS on powval.com,
  Cloudflare free tier for DNS/CDN.
- Cron: weekly comps refresh; nightly DB backup; both log to files with a
  last-run-status line the founder can check in one command.
- Monitoring: uptime ping on `/` and `/api/estimate` (healthcheck variant); job-failure
  notification by email.
- Scrape spike runs from the VPS with conservative throttling (§11); if blocked,
  that's a finding, not an outage — the site is unaffected.

---

## 11. Legal & compliance

- **eBay ToS:** scraping eBay violates their terms. The spike is deliberately small,
  throttled (single-digit requests/min, off-peak, identified user agent), time-boxed,
  and for internal validation only. Scraped numbers never ship to end users in
  production; production sold-price claims wait for licensed API data. Risk accepted
  for the spike, revisited before launch.
- **API terms:** Marketplace Insights data has usage/display restrictions — read them
  during Phase 0 and record what the UI may show (e.g. whether individual comps can be
  displayed vs aggregates only).
- **Privacy:** estimate inputs are not personal data unless tied to an email; if
  estimate logging is linked to waitlist identity later, that requires a privacy-note
  update on the site.

---

## 12. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| eBay MI API application rejected | medium | Spike proves model viability cheaply; alternatives: licensed data vendors, Terapeak-manual calibration, partner via an AU reseller account |
| Too few AU comps per model (thin market) | medium-high | Match tiering + fallback curve designed in from day one; widen window beyond 90 days with recency decay |
| Title parsing accuracy too low | medium | Catalog-first deterministic parser, hand-labeled eval set, LLM batch assist as the escape hatch |
| Scrape spike blocked early | medium | It's a spike — switch to manual Terapeak sampling for calibration |
| Seasonality misleads (estimates calibrated in winter, served in summer) | medium | Month multiplier + honest UI copy; revisit after first full season of data |
| Solo-founder bandwidth | high | Phases are independently shippable; v0 alone fulfils the landing-page promise |

---

## 13. Phased delivery plan

**Phase 0 — Data spike & applications (1–2 weeks, decision gate)**
Submit eBay MI API application. Build throttled scrape spike; collect ≥ 1,000 AU
sold listings for ~20 popular models. Measure: comps volume per model, parse rate,
price dispersion. *Gate: is comps density sufficient for tier (a)/(b) matching on
popular models? If not, fallback-curve-first strategy is promoted.*

**Phase 1 — Catalog + parser (1–2 weeks)**
Seed catalog (top brands/models, MSRP, tiers). Deterministic parser to §5.4 target.
Hand-label 200 titles as the parser eval set. SQLite migration of `lib/storage.js`
(waitlist included).

**Phase 2 — v0 estimator + API (1–2 weeks)**
`services/estimate.js` implementing §6.1–6.4, `POST /api/estimate`, weekly cron job,
caching, rate limit. Eval harness (§7) with first frozen holdout. *Gate: §1 success
criteria measured (not necessarily met — measured).*

**Phase 3 — Calibration & launch hardening**
Calibrate adjustments from data, tune ranges to hit ≥ 80% coverage without absurd
widths, expert spot-checks, wire the real estimator into the site UI. *Gate: §1 table
green → public launch of the estimator.*

**Phase 4 — v1 trained model (only if justified)**
Python sidecar, GBM, must beat v0 per §6.5. Otherwise this phase is permanently skipped
with a clear conscience.

---

## 14. Future: photo-based intake (post-launch)

The end-state UX Will wants: photograph your skis, the system reads what it can and
prefills the estimate form; the user confirms and gets the number. Not in v1, but v1
decisions are made with this in mind.

### Why it isn't OCR

Skis rarely carry a structured data tag. What a photo actually offers:

| Attribute | Source in photo | Difficulty |
|---|---|---|
| `lengthCm` | Printed near tail/sidewall | OCR — easy-moderate |
| `brand` | Logo/wordmark on topsheet | OCR/logo detection — easy-moderate |
| `model` | Stylized topsheet artwork, often not legible text | Image recognition vs catalog — hard |
| `year` | Almost never printed; identified by that season's graphic | Per-season artwork classification — hard |
| `condition` | Base/topsheet/edge close-ups | Grading model — hard, and trust-sensitive |

So the core requirement is a **topsheet-recognition model** mapping photos onto the §5.3
catalog (model + season), plus OCR for length/brand as prefill assists.

### Requirements

- **Dataset bootstrapping is the design constraint.** Once the text estimator is live,
  add an optional "add photos of your gear" step *after* the user has confirmed
  brand/model/year — every upload is a labeled training image. Target: a few thousand
  labeled photos before training is attempted. The catalog gains an artwork-reference
  field (stock topsheet images per model-year) as a second source.
- **Prefill, never decide.** Recognition output populates the form for user
  confirmation; a misidentified ski silently fed into the model would destroy exactly
  the credibility the product sells. Show top-k matches with thumbnails when uncertain.
- **Serving:** vision inference joins the Python sidecar (same VPS to start); the
  Node request path treats it like any other prefill helper — site works fully without it.
- **Privacy/storage:** photo upload requires explicit consent wording for training
  reuse, an object-storage location with lifecycle rules, and a privacy-note update on
  the site (extends the §11 item). Strip EXIF GPS on ingest.
- **Condition-from-photos** stays a stretch goal behind its own evaluation gate;
  condition disputes are where trust dies, so the human-selected rubric (§4) remains
  authoritative until a grader provably agrees with experts.

### Sequencing

Earliest sensible start: after Phase 3 (live estimator generating labeled uploads).
Pipeline: collect consented labeled photos → OCR prefill for length/brand (cheap win,
ship first) → topsheet classifier for model/season → condition grading (maybe never).

## 15. Open questions for Will

1. Do you have (or want to create) an eBay developer account + seller account this week? Phase 0 starts there.
2. Budget ceiling for data (if eBay rejects: licensed-data vendors exist at real cost)?
3. Who are the 2 gear-literate spot-checkers?
4. Should early waitlist members get the estimator before the public (matches "founding member" promise — affects launch sequencing, not the model)?

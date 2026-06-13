# PowVal Valuation Engine — Development Plan

> **For agentic workers:** This is a **program plan** spanning five phases. It is intentionally at workstream granularity, not bite-sized TDD steps, because the later phases depend on data and calibration results that don't exist yet. **Each phase is drilled into its own bite-sized TDD implementation plan (via `superpowers:writing-plans`) at the moment it's executed**, starting from real inputs. Do not implement directly from this document; generate the per-phase plan first.

**Goal:** Turn `ml/task_outline.md` (requirements) into an executable, phase-by-phase roadmap for the "What's My Gear Worth?" estimator — from raw data sourcing to a real number in the hero panel.

**Architecture:** Offline data/model work lives in `ml/` and `jobs/`; the request path stays in `routes/` → `services/` → `lib/` like the rest of the app (CLAUDE.md). Storage is the single SQLite file `data/powval.db`. The estimator ships in phases: a Node v0 heuristic first, a Python sidecar only if it earns its place.

**Tech stack:** Node 22 + Express (existing), `better-sqlite3`, Handlebars (existing), Node's built-in test runner (`node --test` — zero new dependency), and — only in Phase 4, only if justified — Python (FastAPI + a gradient-boosted regressor).

---

## How to read this plan

- **Phases are independently shippable.** Phase 2 (v0 estimator) alone fulfils the landing-page promise; Phase 4 may be permanently skipped with a clear conscience.
- **Section refs** (e.g. §6.1) point into `ml/task_outline.md`, which remains the source of truth for *requirements*. This document is the source of truth for *sequencing and structure*.
- **Acceptance gates are measurable.** A phase isn't "done" until its gate is demonstrated, not asserted.
- **Decisions needed** are called out per phase so they're resolved before, not during, execution.

### Testing approach (applies to every phase)

The repo currently has **no tests and no test runner**. This plan introduces Node's built-in runner — no dependency, native to Node 22:

- Add to `package.json` scripts: `"test": "node --test"` and `"test:ml": "node --test ml/"`.
- Tests live next to the code as `*.test.js` (e.g. `ml/parse/parse-title.test.js`).
- **No network in tests.** Anything that touches eBay is tested against saved HTML/JSON fixtures in `ml/**/fixtures/`. The request path is tested by booting the Express app on an ephemeral port and using `fetch`.
- TDD is the default: failing test → minimal code → green → commit.

### Module map (whole subsystem)

```
ml/
├── task_outline.md          requirements (exists)
├── development-plan.md       this file
├── catalog/
│   ├── catalog.csv           seed data (brands/models/MSRP/tier)
│   ├── import-catalog.js      idempotent CSV → catalog table
│   └── import-catalog.test.js
├── parse/
│   ├── normalize.js           brand aliases, year/season, length
│   ├── parse-title.js         title → structured comp fields
│   ├── parse-title.test.js
│   └── eval/
│       ├── titles.labeled.json   200 hand-labeled titles (frozen)
│       └── run.js                parse-rate + regression diff
├── spike/                    Phase 0, isolated & throwaway-ish
│   ├── ebay-mi-application.md  drafted API application (deliverable)
│   ├── seed-models.js
│   ├── fetch-sold.js          probe-first collector (runs on VPS)
│   ├── parse-listing.js       light parser for the gate only
│   ├── store.js               spike-local SQLite (comps-shaped)
│   ├── report.js              density/dispersion → REPORT.md
│   └── fixtures/              saved HTML for tests
└── eval/
    ├── holdouts/             frozen time-split eval sets
    ├── metrics.js            MdAPE, MAPE, coverage, width, fallback rate
    └── run.js                one-line pass/fail summary

jobs/
└── refresh-comps.js          weekly cron: fetch → parse → upsert → recompute

services/
└── estimate.js               v0 estimator (request path)

routes/
└── estimate.js               POST /api/estimate (thin)

lib/
├── storage.js                extended (exists)
└── comps.js                  findComps(filters) / upsertComps(rows) / model stats
```

---

## Phase 0 — Data spike + eBay MI API application

**Objective:** Answer the gate — *for ~20 popular models, are there enough AU sold comps in a 90-day window to support tier (a)/(b) matching (§6.1)?* And start the slow eBay approval clock.

**Depends on:** Nothing buildable. The *application* depends on Will's eBay developer account (pending). The *spike* runs on the VPS.

**Deliverables:**
- `ml/spike/ebay-mi-application.md` — the full drafted Marketplace Insights API application (use case, data-use/display justification, business + technical answers) for Will to paste-and-submit.
- `ml/spike/` toolkit (seed-models, fetch-sold, parse-listing, store, report).
- `ml/spike/REPORT.md` — generated: per-model 90-day comp counts, parse/match rate, price median + IQR, and a one-line **gate verdict**.

**Interfaces:**
```js
// parse-listing.js
parseListing(html, targetModel) => [{ title, priceAUD, soldDate, url, matched: bool }]
// report.js
buildReport(rows) => { perModel: [{ model, n90d, matchRate, median, iqr }], verdict }
```

**Workstreams:**
1. Draft `ebay-mi-application.md` (Will submits when account clears).
2. Define `seed-models.js` (~20 models spanning tiers — see task_outline / brainstorm list).
3. **Probe-first:** one conservative request to an eBay AU sold/completed page; record whether sold HTML is fetchable + parseable → resolves the open "fetch+cheerio vs headless" decision (§2) with evidence.
4. Throttled collector: identified UA, `robots.txt`-aware, single-digit req/min, off-peak, saves **raw HTML** to `ml/spike/fixtures/` (raw kept forever = future training data, §5.2).
5. Light parser: extract `{title, priceAUD, soldDate, url}` per result row, tagged with the seed model searched (no full entity resolution yet — that's Phase 1).
6. Store (comps-shaped SQLite, idempotent) + report with the gate verdict.

**Tests:** `parse-listing` unit tests against saved HTML fixtures; `report` aggregation tests on synthetic rows. No network in tests.

**Acceptance gate:** `REPORT.md` exists and answers: *is comps density sufficient for tier (a)/(b) on the popular models?* If **no** → the depreciation-fallback-first strategy (§6.2) is promoted for launch and Phase 2 leans on it.

**Boundaries & legal (§11):** Internal validation only; scraped numbers never ship to users. No detection-evasion ever. A block is a finding, not an outage → fall back to **Terapeak** manual sampling.

**Decisions needed:** eBay dev account (pending); fetch vs headless (resolved by the probe); data budget if eBay rejects (§15.2).

---

## Phase 1 — Catalog + parser + storage graduation

**Objective:** A real gear catalog, a deterministic title parser hitting **≥80% high-confidence** (§5.4), and `lib/` query methods the estimator needs. **This phase needs zero eBay data — it's the unblocked foundation to build now.**

**Depends on:** Nothing external. Hand-labels can be drawn from spike raw HTML or listings browsed in a normal browser (reading as a human is fine).

**Deliverables:**
- `ml/catalog/catalog.csv` + `import-catalog.js` (idempotent import).
- `ml/parse/normalize.js`, `parse-title.js` + tests.
- `ml/parse/eval/titles.labeled.json` (200 hand-labeled) + `eval/run.js`.
- `lib/comps.js` exposing the comps + catalog query interface; `data/powval.db` gains `comps` and `catalog` tables.

**Schemas (SQLite DDL):**
```sql
CREATE TABLE catalog (
  brand TEXT, model TEXT, aliases TEXT,        -- aliases: JSON array
  category TEXT, years TEXT, lengthsCm TEXT,    -- JSON arrays
  msrpAud INTEGER, tier TEXT,                    -- budget|mid|premium|race
  PRIMARY KEY (brand, model)
);
CREATE TABLE comps (
  id TEXT, source TEXT,                          -- mi-api|scrape|manual
  titleRaw TEXT,
  category TEXT, brand TEXT, model TEXT, year INTEGER, lengthCm INTEGER,
  conditionGrade INTEGER, bindingsIncluded INTEGER,
  priceSold REAL, currency TEXT, shipping REAL,
  soldAt TEXT, region TEXT, url TEXT,
  parseConfidence REAL, parseVersion INTEGER, fetchedAt TEXT,
  PRIMARY KEY (id, source)
);
```

**Interfaces:**
```js
// lib/comps.js
upsertComps(rows)                       // idempotent; never duplicates on re-run
findComps({ category, brand, model, year, lengthCm, sinceDays }) => rows
findCatalog({ brand, model }) => entry | null
// ml/parse/parse-title.js
parseTitle(titleRaw, catalog) => {
  category, brand, model, year, lengthCm,
  conditionGrade, bindingsIncluded, parseConfidence  // 0..1
}
```

**Workstreams (each TDD):**
1. `catalog`/`comps` table DDL added behind `lib/storage.js`'s schema map; `lib/comps.js` with `upsertComps` (idempotent) + `findComps` + `findCatalog`.
2. Seed `catalog.csv` (top ~50 ski + ~30 board brands, the few hundred dominant secondhand models, MSRP, tier — sources: maker archives, evo/Blister, AU retailers) + idempotent import script.
3. `normalize.js`: brand alias map (`salmon→Salomon`), year/season normalizer (`"21/22"→2021`), length extractor — each with tests.
4. Condition keyword mapper onto the 5-point rubric (§4) + tests.
5. Catalog-driven model matcher (fuzzy, alias-aware) + tests.
6. `parseTitle` orchestrator returning the struct above with a real `parseConfidence` + tests.
7. Hand-label 200 titles → frozen eval set; `eval/run.js` reports parse rate and **diffs against the previous parse** (regression check, §5.4).

**Acceptance gate:** `node ml/parse/eval/run.js` reports **≥80% high-confidence** parses on the 200-label set; catalog imported with the seed models; `lib/comps.js` methods covered by tests.

**Decisions needed:** catalog seeding method — manual CSV vs scripted spec-site scrape (§2). Recommend manual CSV first (small, controllable, no ToS risk).

---

## Phase 2 — v0 estimator + API + refresh job + eval harness

**Objective:** `services/estimate.js` implementing §6.1–6.4, `POST /api/estimate`, the weekly refresh job, caching, rate limiting, and the eval harness with a first frozen holdout. **Structure + depreciation fallback are buildable now (tested on synthetic/seeded comps); "real comps" numbers light up once Phase 0/eBay data lands.**

**Depends on:** Phase 1 (catalog, parser, `lib/comps.js`).

**Deliverables:**
- `services/estimate.js`, `routes/estimate.js` (`POST /api/estimate`).
- `jobs/refresh-comps.js` (cron, with a source-adapter interface: MI-API adapter + manual adapter).
- Per-model aggregates snapshot (`data/model-stats`), in-process LRU cache.
- `ml/eval/` harness (`metrics.js`, `run.js`, first frozen holdout).

**Output contract** (every field is the UI's contract, §3):
```json
{ "low": 280, "expected": 420, "high": 560, "currency": "AUD",
  "confidence": "high", "compsUsed": 47, "windowDays": 90,
  "method": "comps", "catalogMatch": {"brand":"Salomon","model":"QST 98","year":2021},
  "lastUpdated": "2026-06-08T00:00:00Z" }
```

**Interfaces:**
```js
// services/estimate.js
estimate(input) => outputContract            // input = the six factors (§3)
// internal, each independently tested:
matchTiers(input, comps) => { tier, comps }  // (a) exact → (b) model/any-year → (c) brand+tier
weightedEstimate(comps) => { low, expected, high }  // recency-weighted median + IQR, widened for small n
applyAdjustments(base, input) => adjusted    // condition, bindings, length penalty, seasonality
depreciationFallback(catalogEntry, age, condition) => { low, expected, high }
confidenceFor(comps, dispersion) => "high"|"medium"|"low"   // §6.3
```

**Workstreams (each TDD, mostly on synthetic comps until real data exists):**
1. Input validation/normalization — reuse the waitlist hardening pattern (coerce, length caps, 422s).
2. Catalog match (resolve brand/model/year/length to a catalog entry).
3. Comps query + **match tiering** (a)/(b)/(c), age-adjusted.
4. Recency-weighted median (`expected`) + weighted 25th/75th (`low`/`high`), widened when n is small.
5. Adjustments: condition grade, bindings, length-mismatch penalty, seasonality (identity multiplier until ≥6 months data, §6.4).
6. Floor/ceiling sanity (never above live-asking median, never below ~A$20 scrap).
7. Depreciation fallback (MSRP age-decay, condition-adjusted), labeled `method:"depreciation-fallback"`, `confidence:"low"`.
8. `confidenceFor` mapping (§6.3) → explicit, and surfaced in the contract.
9. `estimate()` orchestrator producing the full contract.
10. `POST /api/estimate` route + a stricter rate-limit bucket (20/min/IP, reuse `server.js` limiter).
11. In-process LRU keyed by normalized input; invalidated by the refresh job.
12. `jobs/refresh-comps.js`: adapter interface, recompute per-model aggregates, write snapshot, log a run report; failure never breaks the site (serves last good snapshot, honest `lastUpdated`).
13. Eval harness: **time-based** holdout split (never random — leakage via duplicate listings), `metrics.js` (MdAPE/MAPE of `expected`, range coverage, range width, fallback rate, per-category/brand-tier slices), one-line pass/fail; freeze the first holdout.

**Acceptance gate:** §1 success criteria are **measured** (not necessarily met) by `ml/eval/run.js` on the frozen holdout; `POST /api/estimate` returns the contract for a catalog-matched request; the refresh job runs end-to-end on sample data. The request path **never** scrapes or hits eBay live (§8).

**Decisions needed:** whether estimates are logged with user identity (privacy, §11/§15).

---

## Phase 3 — Calibration + launch hardening + hero wiring

**Objective:** Calibrate adjustments from real data, tune ranges to **≥80% coverage without absurd widths**, pass expert spot-checks, and replace the hero's fake `$420` loop with the real estimator output.

**Depends on:** Phase 2 + real comps (Phase 0/eBay data). Hero wiring depends on the §3 contract being live.

**Deliverables:**
- `ml/calibration/` scripts deriving condition multipliers, the seasonality month table, and the length penalty from comps — replacing the hardcoded priors.
- Hero UI change: `public/js/main.js`'s `initPriceCounter` (the fake loop) replaced with a real estimator surface that consumes the §3 contract; UI visibly distinguishes **comps-backed** vs **depreciation-fallback** (confidence copy, §6.3).
- `ml/eval/spot-checks/YYYY-MM-DD.md` — the 20-item human spot-check sheet (founder + 2 gear-literate skiers).

**Acceptance gate:** the §1 table goes **green** (coverage ≥80%, MdAPE ≤20%, coverage of catalog ≥70%, latency budget, expert sniff test) → **public launch of the estimator**.

**Decisions needed:**
- **Hero = interactive mini-estimator vs. showcase cycling real estimates?** (The full estimate *page* is a separate frontend task, out of scope per §8 — but the hero must show real contract output.) This is a design/brainstorm task of its own when we reach it.
- The 2 gear-literate spot-checkers (§15.3).
- Early-access sequencing for waitlist members (§15.4) — affects launch, not the model.

---

## Phase 4 — v1 trained model (conditional — only if it earns its place)

**Objective:** A Python sidecar gradient-boosted regressor that **beats v0 by a margin that matters** (≥3pp MdAPE or ≥5pp coverage improvement on the frozen holdout, §6.5). If it can't, this phase is **permanently skipped**.

**Depends on:** Phase 2/3 producing enough clean comps and a v0 baseline to beat.

**Deliverables:**
- `ml/model/` (Python): `features.py` (model embedding/one-hot, age, length delta, condition, bindings, tier, month, liquidity), `train.py`, `serve.py` (FastAPI/uvicorn on localhost).
- Node-side client in `services/estimate.js` that calls the sidecar and **falls back to v0 if it's down**.

**Acceptance gate:** the graduation gate (§6.5) is demonstrated on held-out data. Otherwise: record the negative result and skip — v0 stays.

**Decisions needed:** only commit to this phase if the data justifies it. No new runtime until then.

---

## Beyond launch — photo-based intake (§14)

Out of scope for this estimator program, sequenced **after Phase 3** once the live estimator is generating consented, labeled uploads (every confirmed estimate + photo is a training pair). It is *not* OCR: the core is a topsheet-recognition model mapping photos onto the Phase 1 catalog (model + season), with OCR only as a prefill assist for length/brand. The point of listing it here: v1 decisions are made so as not to preclude it — typed brand/model entry with catalog autocomplete is the launch flow, and the catalog schema gains an artwork-reference field when this starts. It gets its own brainstorm → spec → plan cycle when reached.

---

## Cross-cutting concerns

- **Ops (§10):** weekly `refresh-comps` cron + the existing nightly DB backup; uptime ping on `/` and an `/api/estimate` healthcheck variant; job-failure email reusing the Resend setup from the backup report.
- **Eval discipline (§7):** frozen, time-split holdouts in `ml/eval/holdouts/`; any parser/adjustment/model change must not worsen MdAPE/coverage on the frozen set (regression gate).
- **Legal (§11):** scraped numbers never ship; encode the MI-API display restrictions in the UI once the terms are read; strip EXIF GPS if/when photo intake (§14) starts.

### Decisions register (resolve before the relevant phase)

| Decision | Phase | Default / recommendation |
|---|---|---|
| Scrape tooling: fetch vs headless | 0 | Resolve by probe; prefer plain fetch + cheerio |
| eBay dev account + MI application | 0 | Pending approval; application drafted, ready to submit |
| Data budget if eBay rejects | 0 | Decide ceiling; Terapeak-manual fallback meanwhile |
| Catalog seeding method | 1 | Manual CSV first (no ToS risk) |
| Estimate logging tied to identity | 2 | Default: log inputs only, no identity, until decided |
| Hero: interactive vs showcase | 3 | Decide at Phase 3 (own design task) |
| The 2 expert spot-checkers | 3 | Will to name |
| Early access for waitlist members | 3 | Sequencing only; doesn't affect the model |
| Pursue Phase 4 trained model | 4 | Only if it beats v0 by the §6.5 margin |

---

## Recommended execution order (given the eBay account is pending)

The dependency reality: real comps are blocked on the eBay account, but **most of the system isn't.** Build the unblocked foundation now so that the day data arrives, it slots into a tested engine:

1. **Phase 1** (catalog + parser + `lib/comps.js`) — fully unblocked.
2. **Phase 2 skeleton** (estimator + `/api/estimate` + eval harness + depreciation fallback) — runs on catalog + fallback today, tested on synthetic comps. This already lets the hero show **real, honestly-labeled** estimates.
3. **Phase 0** in parallel as the account clears (submit the drafted MI application; run the spike on the VPS).
4. **Phase 3** once comps exist: calibrate, then wire the hero.
5. **Phase 4** only if justified.

Each numbered item above becomes its **own bite-sized TDD implementation plan** when we start it.

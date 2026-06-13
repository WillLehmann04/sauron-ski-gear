---
target: PowVal landing page (views/index.ejs)
total_score: 34
p0_count: 0
p1_count: 2
timestamp: 2026-06-12T13-59-39Z
slug: views-index-ejs
---
# Design Critique — PowVal landing page (style, branding, sign-up likelihood)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Spinner, success card, inline errors, scroll progress — solid |
| 2 | Match System / Real World | 4 | Speaks skier fluently ("QST 92", sold vs asking prices) |
| 3 | User Control and Freedom | 3 | No way to fix a typo'd email after the success card appears |
| 4 | Consistency and Standards | 3 | Two oranges (logo #F4791F vs CTA #e87b1e); DESIGN.md drifted from shipped page |
| 5 | Error Prevention | 3 | Good validation + honeypot; no typo-domain catch |
| 6 | Recognition Rather Than Recall | 4 | Everything visible and labeled |
| 7 | Flexibility and Efficiency | 3 | Single path is appropriate for a lander |
| 8 | Aesthetic and Minimalist Design | 4 | Committed, purposeful, distinctive |
| 9 | Error Recovery | 4 | Specific messages at the field, input preserved |
| 10 | Help and Documentation | 2 | No answer to "when does this launch?" / "what happens to my email?" |
| **Total** | | **34/40** | **Good** |

## Anti-Patterns Verdict: PASS
Does not read as AI-generated. Committed midnight-alpine identity, WebGL snow, animated valuation panel, lift-ticket condensed type. Honest tells: DM Sans body (training-data default, acknowledged in DESIGN.md); rule-separated 3-column pillars rescued by condensed headings. Deterministic scan: 0 findings (views/ + Vue templates). Browser overlay unavailable (no controllable tab); evidence via headless screenshots at 1440px and true 390px.

## Priority Issues
- [P1] Beacon points at a word, not the action: hero CTA is white while orange decorates "WORTH?". Make hero CTA the orange beacon (form CTA is a viewport below). → /impeccable bolder
- [P1] DESIGN.md describes a page that no longer exists (bluebird gradient vs shipped midnight ink; two-shadow rule vs actual glows). Regenerate from live code. → /impeccable document
- [P2] Thin trust scaffolding: "Early access list is open" is filler; footer has no contact/privacy. Add verifiable proof line + minimal footer contact. → /impeccable clarify
- [P2] $420 payoff arrives 8.5s into a 12s loop; lead with or hold the value state longest. → /impeccable animate
- [P2] No recovery from mistyped email on success card; add "Wrong email? Re-enter it" reset link. → /impeccable harden

## Persona Red Flags
- Morgan (expert skier): page sells an estimator but only offers an email field; panel demo bridges the gap only if the right 4s of the loop is caught.
- Jordan (first-timer): no launch window anywhere; value of signing up unquantifiable.
- Riley (stress tester): duplicates/malformed input now handled; success state lost on refresh reads as "did that count?".
- Casey (mobile): thumb-zone CTAs, no overflow at 390px; nav CTA out of thumb reach but compensated.

## Minor Observations
- Unify logo orange #F4791F with system #e87b1e.
- 300-weight DM Sans at 15px borderline thin; consider 400 body.
- Page ends on B2B band → bare footer; no closing consumer CTA (flat end, peak-end rule).
- og:image is the 512 icon; a branded share card would strengthen the waitlist growth loop.

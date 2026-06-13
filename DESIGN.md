---
name: PowVal
description: Instant resale estimates for ski and snowboard gear
colors:
  ink-900: "#060d16"
  ink-850: "#091828"
  ink-700: "#0d3152"
  alpine-blue: "#3a7aaa"
  alpine-mid: "#72b8dc"
  ice-sky: "#b8d6ec"
  fresh-snow: "#fafcff"
  surface: "#ffffff"
  navy: "#1c2d3a"
  blue-secondary: "#5a7088"
  border: "#cddae6"
  orange-cta: "#e87b1e"
  orange-deep: "#d06c14"
  error: "#dc2626"
  success: "#16a34a"
typography:
  display:
    fontFamily: "'Barlow Condensed', sans-serif"
    fontSize: "clamp(76px, 11vw, 96px)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "'Barlow Condensed', sans-serif"
    fontSize: "22px"
    fontWeight: 800
    letterSpacing: "0.03em"
  body:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 300
    lineHeight: 1.65
  label:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.16em"
  small:
    fontFamily: "'DM Sans', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
rounded:
  card: "14px"
  panel: "18px"
  input: "7px"
  button: "7px"
spacing:
  xs: "4px"
  sm: "12px"
  md: "20px"
  lg: "32px"
  xl: "48px"
  hero: "64px"
components:
  button-primary:
    backgroundColor: "{colors.orange-cta}"
    textColor: "#ffffff"
    rounded: "{rounded.button}"
    padding: "13px 22px"
    typography: "Barlow Condensed 800 17px uppercase 0.05em tracking"
  button-primary-hover:
    backgroundColor: "{colors.orange-deep}"
  input-default:
    backgroundColor: "{colors.fresh-snow}"
    textColor: "{colors.navy}"
    rounded: "{rounded.input}"
    padding: "10px 13px"
  input-focus:
    backgroundColor: "{colors.fresh-snow}"
    textColor: "{colors.navy}"
    rounded: "{rounded.input}"
    padding: "10px 13px"
  form-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "32px"
---

# Design System: PowVal

## 1. Overview

**Creative North Star: "The Wax Room"**

The wax room is where serious skiers do their own tuning — a small, hot, purposeful space hung with used tools and marked by the smell of hot wax. Nothing in it is decorative. Every object is there because it's needed. The visual system takes the same stance: every element earns its place by doing a job. If something could be removed without losing information, it should be.

The color logic is an alpine night before a powder day. The page is built on a deep blue-black ink scale — ink-900 at the hero summit, ink-850 in the commitment zones (waitlist form, footer), ink-700 for the ski-shop band — with cold radial pools of mountain-sky blue and falling snow. White cards float on the dark ink where action happens. The orange CTA is a beacon: the color of a safety marker, a race gate, a ski patrol coat. It means "action required" and appears once per viewport, always on the primary action.

Typography is authority without formality. Barlow Condensed 800 in all caps reads like a lift-ticket or a trail sign — confident, compressed, cut from the terrain. DM Sans makes the body text feel like a conditions report: legible, undramatic, here to give you information.

This system explicitly rejects Facebook Marketplace density (no classified-ad grids, no transaction-database layouts), evo.com catalogue feel (no gear-photo rows, no product-category navigation), and generic startup restraint (no cream-and-slate landing pages, no muted SaaS aesthetic).

**Key Characteristics:**
- Dark ink-scale surfaces (ink-900 → ink-850 → ink-700) alternating with fresh-snow light bands; one page, one blue-black family
- Beacon orange on exactly one primary action per viewport (hero CTA, waitlist submit, shop submit)
- Barlow Condensed 800 for all display and heading text; DM Sans 300 on dark, 400 on light for body
- Shadows are hue-shifted into the brand's blue-black (navy rgba(28,60,90,x) on light surfaces, deep-ink rgba(4,12,24,x) on dark); pure black rgba(0,0,0,x) is forbidden
- WebGL snow, the animated valuation panel, and the slope-cut diagonal are the signature moves

## 2. Colors: The Night Mountain Palette

A Drenched dark palette: the surface IS the color. The mountain at night has one beacon.

### Ink scale (surfaces)
- **Ink 900** (#060d16): The hero. Deepest, immersive, pre-dawn summit. Radial pools of rgba(11,50,86) and rgba(7,32,60) give it altitude.
- **Ink 850** (#091828): The commitment zones — waitlist form section, hero slope cut, footer.
- **Ink 700** (#0d3152): The ski-shop B2B band. Lighter, same hue family, with an alpine-blue radial glow.

### Primary
- **Alpine Blue** (#3a7aaa): Brand identity color. Focus rings, input borders on focus, text links on light surfaces.

### Action
- **Beacon Orange** (#e87b1e): The single CTA color, used on the primary action of each viewport: hero CTA, waitlist submit, shop submit, scrolled-nav CTA pill, and the hero title accent "WORTH?" that names the value proposition. The logo's "VAL" uses the same hex — one orange everywhere.
- **Orange Deep** (#d06c14): Hover and active state for Beacon Orange only.

### Neutral
- **Navy** (#1c2d3a): Primary text on light surfaces. The light-surface shadow anchor.
- **Blue Secondary** (#5a7088): Muted text and placeholders on light surfaces (≥4.5:1 on Fresh Snow).
- **Alpine Mid** (#72b8dc) / **Ice Sky** (#b8d6ec): Light ice blues for tints and hover hints.
- **Fresh Snow** (#fafcff): The light band background (pillars). Almost white with a faint sky hue.
- **Surface** (#ffffff): Cards floating on dark ink (form card, shops card).
- **Border** (#cddae6): Input borders, pillar dividers. Quiet structural lines.
- **Light-on-dark text**: white-alpha and ice-blue-alpha ramps — rgba(168,210,245,a) for supporting copy on ink, a ≥ 0.72 for body-size text (contrast ≥ 4.5:1).

### Named Rules
**The Beacon Rule.** Beacon Orange appears exactly once per viewport, on the primary action. The hero's "WORTH?" accent is the one sanctioned non-button use: it points the title's question at the answer. No orange badges, decorative accents, or hover-only highlights.

**The Hue-Shift Rule.** Shadows stay inside the brand's blue-black: rgba(28, 60, 90, x) on light surfaces, rgba(4, 12, 24, x) on dark ink. Pure rgba(0, 0, 0, x) is forbidden — black shadows flatten the palette and break the mountain color logic.

## 3. Typography

**Display Font:** Barlow Condensed (Google Fonts) — weight 800
**Body Font:** DM Sans (Google Fonts) — weight 300, 400, 500, 600

**Character:** Barlow Condensed at 800 reads like alpine signage — compressed, authoritative, carved into the terrain. DM Sans has the neutral utility of a conditions report: there to be read, not noticed. The pairing works on contrast of intent: the heading commands attention, the body yields it.

Note: DM Sans is a training-data default (see reflex-reject list in brand.md). A future revision should consider Neue Haas Grotesk, ABC Diatype, or Aktiv Grotesk as a body replacement if the system needs more personality at the type level.

### Hierarchy
- **Display** (800, clamp(76px, 11vw, 96px), line-height 0.9, tracking -0.025em): Hero title only. Uppercase. White-alpha lines with the orange accent line.
- **Section heading** (800, clamp(40–60px, 6–10vw, 62–88px)): Form section, pillar heads, shops heading. Uppercase, `text-wrap: balance`.
- **Headline** (800, 22px): Form card titles. Uppercase. Navy on white.
- **Body** (16px, line-height 1.6): weight 300 on dark ink (light text reads heavier), weight 400 on light surfaces (300 reads thin on near-white). Max ~65ch.
- **Label** (600, 11px, tracking 0.1–0.18em, uppercase): The hero eyebrow, nav links, form labels, the "For ski shops" tag.
- **Small** (400, 13px): Error messages, notes, footer links.

### Named Rules
**The Condensed-Only Headings Rule.** All h1–h3 elements use Barlow Condensed 800. DM Sans headings are forbidden. The contrast between compressed display and body creates the system's visual tension; blurring it with a sans heading collapses the hierarchy.

## 4. Elevation

Depth is earned by function. Three things float: the cards where signups happen, the sticky nav, and the hero's valuation panel. Everything else is flat.

### Shadow Vocabulary
- **Card float** (`--card-shadow`: 1px white-alpha ring + `0 20px 60px rgba(4,12,24,0.50)` + faint alpine glow): white form card and shops card resting on dark ink.
- **Beacon glow** (`0 4px 18px rgba(232,123,30,0.32)`, deeper on hover): orange CTAs only — the beacon casts light.
- **Nav solid** (`0 1px 14px rgba(28,60,90,0.09)`): the nav once it has morphed to its light scrolled state.
- **Panel glow** (deep-ink drop + blue ambient glows): the hero valuation panel.

### Named Rules
**The Earned-Shadow Rule.** Shadow marks the three functional layers above the page: action cards, nav, hero panel. Pillars, footer, points lists: flat. If a new component needs emphasis, solve it with border or background tint — not shadow.

## 5. Components

### Buttons
Tactile and confident: you can tell from the weight and scale that pressing this does something.

- **Shape:** Gently curved (7–8px radius)
- **Primary:** Beacon Orange background, white text. Barlow Condensed 800, 17–19px, uppercase. Full width in form context; inline in the hero.
- **Hover:** Orange Deep, slight lift (-1 to -2px translateY), stronger glow. Scale 0.98 on active (press feel).
- **Disabled:** Opacity 0.6, cursor not-allowed.
- **Spinner state:** White 15px spinner with semi-transparent track during submission.

### Inputs / Fields
Understated by design — the form is a tool, not a showcase. Inputs should feel precise, not styled.

- **Style:** 1.5px solid border (#cddae6), Fresh Snow (#fafcff) background, 7px radius, DM Sans 300 14px (16px on mobile to prevent iOS zoom).
- **Placeholder:** Blue Secondary (#5a7088) — lighter than the navy value text but still ≥4.5:1 against the Fresh Snow background (the previous #98b0c4 measured ~2.2:1 and failed WCAG AA).
- **Focus:** Border shifts to Alpine Blue (#3a7aaa), 3px box-shadow glow at rgba(58, 122, 170, 0.13).
- **Error:** Border shifts to Error (#dc2626) on the failing field only, wired with `aria-invalid` and `aria-describedby`. Error message in a tinted error-bg (#fef2f2) pill below.
- **Disabled:** Opacity 0.55, cursor not-allowed.

### Cards / Containers
- **Corner Style:** 14px radius (form/shops cards), 18px (hero panel)
- **Background:** Surface (#ffffff) floating on dark ink
- **Shadow:** Card float (see Elevation)
- **Internal Padding:** 32px (desktop), 24px 20px (mobile)

**The One-Level Nesting Rule.** Nested cards are always wrong. One card per section (form card, shops card). Elements inside them are flat.

### Navigation
- **Default state (over hero):** Glass dark — rgba(8, 18, 30, 0.62), backdrop-filter blur(26px) saturate(190%), white-alpha bottom border, specular top edge. Logo and links in white/ice.
- **Scrolled state:** Morphs (scroll-driven animation, JS class fallback) to rgba(228, 244, 253, 0.97) light glass; logo glyphs recolor to navy; the CTA pill fills Beacon Orange. A thin scroll-progress line runs along the bottom edge.
- **Logo:** PowVal mark (mountain + track + orange dot) plus wordmark — "POW" near-white (#E9ECEF, navy when scrolled), "VAL" Beacon Orange (#E87B1E, same hex as the CTA).
- **Nav links:** DM Sans 600, 11px, uppercase, tracking 0.1em. Two real anchors ("Why PowVal" → #why, "For ski shops" → #shops) — no dead links.
- **Height:** 56px sticky. Links hidden below 640px; the CTA pill keeps a ≥44px touch target there.

### Hero
The defining composition of the system. One dominant idea per fold.

- **Surface:** ink-900 with radial mountain-sky pools (rgba(11,50,86,0.96) top-center, rgba(7,32,60,0.72) top-right) and a darkening base — a pre-dawn summit, not a daytime gradient. Never light.
- **Title:** Three stacked condensed lines; "WHAT'S / MY GEAR" at white 0.80, "WORTH?" in Beacon Orange. The question mark and the beacon CTA below it share one color story: the answer costs one click.
- **Capture:** The inline waitlist form (white email field + Beacon Orange submit) sits directly under the subtitle — the conversion event happens in the fold, no scroll between intent and action. A plain orange "Get early access" link is the pre-mount/no-Vue fallback.
- **Mountain silhouettes:** Two SVG polygon layers in dark-blue gradients (back rgba(22,65,112,0.52), front rgba(8,28,52,0.78)) above the base.
- **Slope cut:** Diagonal SVG polygon at the bottom (fill: ink-850 #091828) — the page transitions from hero into the form section at an angle, not a flat line.
- **Snow:** WebGL particle system (680 desktop / 260 mobile, DPR-capped, mouse repulsion, wind), canvas-2D fallback; pauses via IntersectionObserver when the hero leaves the viewport; fully disabled under prefers-reduced-motion.
- **Valuation panel:** The product demo. A 12s loop weighted toward the payoff — gear entry (~2.5s) → eBay scan (~2s) → **$420 result holding ~6s** with count-up, range track, and comps line. The result state leads the dwell time because the estimate is the product.

## 6. Do's and Don'ts

### Do:
- **Do** put Beacon Orange (#e87b1e) on exactly one primary action per viewport. The beacon is the action.
- **Do** keep shadows in the blue-black family: rgba(28, 60, 90, x) on light, rgba(4, 12, 24, x) on dark. Never rgba(0, 0, 0, x).
- **Do** use Barlow Condensed 800 for all headings and form card titles, uppercase.
- **Do** keep hero text white/white-alpha — the ink surface is dark; dark text is unreadable.
- **Do** keep the slope-cut diagonal at the hero-to-form transition. It's the single most distinctive layout element.
- **Do** respect prefers-reduced-motion everywhere: snow, panel loop, reveals, smooth scroll.
- **Do** use DM Sans 400 for body text on light surfaces; weight 300 is reserved for light-on-dark copy where halation adds weight.

### Don't:
- **Don't** add dense-classifieds layout (Facebook Marketplace / eBay energy): no grid of gear photos, no price-tag rows, no multi-column listing tables.
- **Don't** use outdoor-retail catalogue aesthetics (evo.com / REI feel): no category grids, no "Shop All Helmets" navigation, no product-photography-as-design.
- **Don't** add Beacon Orange to anything that isn't a primary action (the hero "WORTH?" accent and logo "VAL" are the two standing exceptions — don't add more).
- **Don't** use black shadows (rgba(0,0,0,x)) anywhere. The hue-shift rule is non-negotiable.
- **Don't** use gradient text (`background-clip: text` + gradient). One solid color per text element.
- **Don't** add a side-stripe border (border-left > 1px as a colored accent on cards or alerts). Use background tint or full border instead.
- **Don't** put uppercase tracked eyebrows above every section. The hero eyebrow is the one named kicker; the "For ski shops" tag is a badge, not a kicker. Further sections don't repeat the pattern.
- **Don't** make the hero background light or near-white. The power of the design is the ink-900 summit at night. A washed-out hero collapses the whole composition.
- **Don't** ship dead navigation. Every nav item is a real anchor or link; "coming soon" teasers are false affordances.

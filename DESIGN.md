---
name: GearWorth
description: Instant resale estimates for ski and snowboard gear
colors:
  deep-sky: "#0d4f7c"
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
    fontSize: "clamp(52px, 9vw, 84px)"
    fontWeight: 800
    lineHeight: 0.93
    letterSpacing: "-0.02em"
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
  card: "10px"
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
    padding: "12px 20px"
    typography: "Barlow Condensed 800 17px uppercase 0.06em tracking"
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
    padding: "28px 32px"
---

# Design System: GearWorth

## 1. Overview

**Creative North Star: "The Wax Room"**

The wax room is where serious skiers do their own tuning — a small, hot, purposeful space hung with used tools and marked by the smell of hot wax. Nothing in it is decorative. Every object is there because it's needed. The visual system takes the same stance: every element earns its place by doing a job. If something could be removed without losing information, it should be.

The color logic follows the physical world. The hero gradient — from deep mountain-sky at #0d4f7c to fresh snow at #fafcff — is the literal view from a summit on a bluebird February morning. The orange CTA is a beacon: the color of a safety marker, a race gate, a ski patrol coat. It means "action required." It appears once. The rest of the system is the mountain: cold blues, clean whites, navy shadows.

Typography is authority without formality. Barlow Condensed 800 in all caps reads like a lift-ticket or a trail sign — confident, compressed, cut from the terrain. DM Sans at weight 300 makes the body text feel like a conditions report: legible, undramatic, here to give you information.

This system explicitly rejects Facebook Marketplace density (no classified-ad grids, no transaction-database layouts), evo.com catalogue feel (no gear-photo rows, no product-category navigation), and generic startup restraint (no cream-and-slate landing pages, no muted SaaS aesthetic).

**Key Characteristics:**
- Deep blue-to-snow gradient hero; white text on dark altitude, dark text on fresh-snow base
- A single beacon orange for primary action only
- Barlow Condensed 800 for all display and heading text; DM Sans 300/400 for body
- Hue-shifted shadows in navy-blue (rgba(28, 60, 90, x)); black shadows are forbidden
- Structural elevation on form card and nav; all other surfaces flat

## 2. Colors: The Mountain Palette

A full-gradient Committed palette: the hero IS the color. The mountain has one accent.

### Primary
- **Deep Sky** (#0d4f7c): The hero gradient anchor at altitude. Deep, authoritative. Used only in the hero background and as the nav's glass tint over the hero.
- **Alpine Blue** (#3a7aaa): Brand identity color. Links, focus rings, input borders on focus, border-focus states. The reliable mid-sky hue.

### Secondary
- **Beacon Orange** (#e87b1e): The single CTA color. Used exclusively on the primary submit button, critical action triggers. One beacon per screen.
- **Orange Deep** (#d06c14): Hover and active state for Beacon Orange only.

### Neutral
- **Navy** (#1c2d3a): Primary text, footer backgrounds, deep surfaces. The shadow color's anchor.
- **Blue Secondary** (#5a7088): Muted text, secondary descriptors, nav links when scrolled. Where Navy is too heavy.
- **Alpine Mid** (#72b8dc): Mid-gradient hero color. Background tints for light-accent surfaces.
- **Ice Sky** (#b8d6ec): Light ice blue. Background hints, hovered nav states.
- **Fresh Snow** (#fafcff): Body background. The runout at the base. Almost white but carries a faint sky hue.
- **Surface** (#ffffff): Card and elevated component backgrounds. Sits above Fresh Snow.
- **Border** (#cddae6): Input borders, dividers, feature strip rules. Quiet structural lines.

### Named Rules
**The Beacon Rule.** Beacon Orange (#e87b1e) appears exactly once per screen — the primary CTA button. Adding it to badges, notifications, hover treatments, or decorative accents dilutes the beacon. The rarity is the function.

**The Hue-Shift Rule.** All shadows use rgba(28, 60, 90, x) — the navy-blue shift of the brand. rgba(0, 0, 0, x) is forbidden. Black shadows flatten the palette and break the mountain color logic.

## 3. Typography

**Display Font:** Barlow Condensed (Google Fonts) — weight 700, 800
**Body Font:** DM Sans (Google Fonts) — weight 300, 400, 500, 600

**Character:** Barlow Condensed at 800 reads like alpine signage — compressed, authoritative, carved into the terrain. DM Sans at 300 has the neutral utility of a conditions report: there to be read, not noticed. The pairing works on contrast of intent: the heading commands attention, the body yields it.

Note: DM Sans is a training-data default (see reflex-reject list in brand.md). A future revision should consider Neue Haas Grotesk, ABC Diatype, or Aktiv Grotesk as a body replacement if the system needs more personality at the type level.

### Hierarchy
- **Display** (800, clamp(52px, 9vw, 84px), line-height 0.93, tracking -0.02em): Hero title only. Uppercase. White on deep blue.
- **Headline** (800, 22px, tracking 0.03em): Section headings and form card titles. Uppercase. Navy on white.
- **Title** (600, 14px): Feature titles, bold subheads within content.
- **Body** (300, 16px, line-height 1.65): Subtitles, descriptions, help text. Max 65ch line length.
- **Label** (600, 11px, tracking 0.16em, uppercase): Eyebrows, form field labels, nav links, metadata. Use sparingly — one named eyebrow per page maximum.
- **Small** (400, 13px): Error messages, captions, secondary form notes.

### Named Rules
**The Condensed-Only Headings Rule.** All h1–h3 elements use Barlow Condensed 800. DM Sans headings are forbidden. The contrast between compressed display and light body creates the system's visual tension; blurring it with a sans heading collapses the hierarchy.

## 4. Elevation

The system uses structural shadows on two key surfaces only: the form card and the sticky nav. All other surfaces are flat. Depth is earned by function, not decoration.

The shadow recipe is always hue-shifted to navy-blue to maintain palette coherence. A form card sitting on fresh-snow background needs the shadow to read as "part of the mountain," not as a generic UI shadow.

### Shadow Vocabulary
- **Card lift** (`0 2px 4px rgba(28, 60, 90, 0.06), 0 8px 28px rgba(28, 60, 90, 0.10)`): The form card. A soft ambient layer plus a structural mid-lift. Grounds the form like an object resting on a slope.
- **Nav solid** (`0 1px 8px rgba(28, 60, 90, 0.08)`): Applied to the nav when `.nav--solid` class is active (scrolled past 40px). Subtle; separates the glass nav from white page content below.

### Named Rules
**The Two-Shadow Rule.** Only the form card and the solid-state nav carry box-shadow. No other element gets elevation. Cards within the form, feature items, footer: flat. If a new component needs emphasis, solve it with border or background tint — not shadow.

## 5. Components

### Buttons
Tactile and confident: you can tell from the weight and scale that pressing this does something.

- **Shape:** Gently curved (7px radius)
- **Primary:** Beacon Orange (#e87b1e) background, white text. Barlow Condensed 800, 17px, uppercase, letter-spacing 0.06em. Padding 12px 20px. Full width in form context.
- **Hover:** Background shifts to Orange Deep (#d06c14). Scale 0.98 on active (press feel).
- **Disabled:** Opacity 0.6, cursor not-allowed.
- **Spinner state:** White 15px spinner (border-top-color #fff) with semi-transparent track, shown during submission. Button text hidden when spinner shows.

### Inputs / Fields
Understated by design — the form is a tool, not a showcase. Inputs should feel precise, not styled.

- **Style:** 1.5px solid border (#cddae6), Fresh Snow (#fafcff) background, 7px radius, DM Sans 300 14px.
- **Placeholder:** #98b0c4 — lighter than body text, readable at 4.5:1 against the Fresh Snow background.
- **Focus:** Border shifts to Alpine Blue (#3a7aaa), 3px box-shadow glow at rgba(58, 122, 170, 0.13).
- **Error:** Border shifts to Error (#dc2626), glow rgba(220, 38, 38, 0.12). Error message in a tinted error-bg (#fef2f2) pill below.
- **Disabled:** Opacity 0.55, cursor not-allowed.

### Cards / Containers
- **Corner Style:** Gently curved (10px radius)
- **Background:** Surface (#ffffff) on Fresh Snow body
- **Shadow:** Card lift (see Elevation section)
- **Border:** None — the shadow provides the separation
- **Internal Padding:** 28px 32px (desktop), 20px 18px (mobile)

**The One-Level Nesting Rule.** Nested cards are always wrong. The form card is the only card on the page. Elements inside it (input fields, error states) are flat.

### Navigation
- **Default state (over hero):** Glass dark — rgba(13, 60, 100, 0.45) background, backdrop-filter blur(20px) saturate(160%), 1px white-at-15% bottom border. Logo and links in white.
- **Solid state (scrolled):** rgba(228, 243, 252, 0.96) background, box-shadow nav solid. Logo and links shift to Navy/Blue Secondary. 0.3s transition.
- **Logo:** Barlow Condensed 800, 18px, uppercase, letter-spacing 0.06em. "Gear" in white (or Navy when solid), "Worth" in Beacon Orange.
- **Nav links:** DM Sans 600, 11px, uppercase, letter-spacing 0.1em.
- **Height:** 56px fixed. No mobile hamburger at launch (links hidden below 640px).

### Hero
The defining composition of the system. One dominant idea per fold.

- **Gradient:** 175deg, #0d4f7c (0%) → #1a6faa (18%) → #3a8ec8 (38%) → #72b8dc (58%) → #b2d8ef (78%) → #d8eef8 (92%) → #edf6fc (100%). Altitude to snowfield.
- **Text:** All white or white-alpha on the dark upper half. Hero title: #ffffff with subtle text-shadow (0 2px 24px rgba(10, 40, 70, 0.25)). Eyebrow: rgba(180, 225, 248, 0.9). Subtitle: rgba(220, 242, 255, 0.85).
- **Mountain silhouettes:** Two SVG polygon layers, rgba(255,255,255,0.38) and rgba(255,255,255,0.65). Structural, not decorative.
- **Slope cut:** Diagonal SVG polygon at bottom (fill: #fafcff) — the page transitions from hero to content at an angle, not a flat line. This is the element that distinguishes the layout.
- **Snow animation:** Canvas-based, 65 particles, opacity 0.2–0.65, respects prefers-reduced-motion.

## 6. Do's and Don'ts

### Do:
- **Do** use Beacon Orange (#e87b1e) exactly once per screen — on the primary action button. One beacon.
- **Do** use hue-shifted shadows: rgba(28, 60, 90, x). Never rgba(0, 0, 0, x).
- **Do** use Barlow Condensed 800 for all headings and form card titles, uppercase.
- **Do** keep hero text white (#ffffff / white-alpha) — the gradient is dark at the top; dark text is unreadable.
- **Do** keep the slope-cut diagonal at the hero-to-content transition. It's the single most distinctive layout element.
- **Do** respect prefers-reduced-motion: the snow canvas animation must be gated by the media query.
- **Do** keep body text at DM Sans weight 300 on Fresh Snow (#fafcff) — check contrast; 300 weight text on near-white backgrounds frequently fails 4.5:1.

### Don't:
- **Don't** add dense-classifieds layout (Facebook Marketplace / eBay energy): no grid of gear photos, no price-tag rows, no multi-column listing tables.
- **Don't** use outdoor-retail catalogue aesthetics (evo.com / REI feel): no category grids, no "Shop All Helmets" navigation, no product-photography-as-design.
- **Don't** add Beacon Orange to anything that isn't a primary action trigger. No orange badges, orange hover highlights, orange decorative accents.
- **Don't** use black shadows (rgba(0,0,0,x)) anywhere. The hue-shift rule is non-negotiable.
- **Don't** use gradient text (`background-clip: text` + gradient). One solid color per text element.
- **Don't** add a side-stripe border (border-left > 1px as a colored accent on cards or alerts). Use background tint or full border instead.
- **Don't** put uppercase tracked eyebrows above every section. The hero eyebrow ("Instant resale estimates") is the one named kicker in the system. Further sections don't repeat the pattern.
- **Don't** use numbered section markers (01 / 02 / 03) as scaffolding unless the content is a genuine ordered sequence. The existing feature strip uses them deliberately; don't add more.
- **Don't** make the hero background light or near-white. The power of the design is the deep-sky anchor at altitude. A washed-out hero collapses the whole composition.

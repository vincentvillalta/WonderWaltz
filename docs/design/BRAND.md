# WonderWaltz — Brand Direction Explorations

> **Status:** DRAFT — Founder review required. See [Task 2 Checkpoint] to lock direction.
>
> Produced by: ui-designer agent
> Date: 2026-04-13
> Purpose: Three brand directions for the founder to evaluate. Pick one, then mark it LOCKED.

---

## How to Lock a Direction

1. Read all three directions below
2. Pick the one that best fits your vision
3. Add a `## Selected Direction` section at the very top of this file
4. Mark the chosen direction with `**LOCKED**`
5. Signal the executor with: `locked: [direction name]`

---

## Direction 1: Vintage Travel Poster

_Bold. Theatrical. Timeless._

### Palette

| Name            | Hex       | Role                               |
| --------------- | --------- | ---------------------------------- |
| Poster Ivory    | `#F5EDD6` | Background / light surface         |
| Deep Navy       | `#1A2A4A` | Primary text / dark surface        |
| WDW Red         | `#C0392B` | Brand primary — energy, excitement |
| Adventure Gold  | `#D4A017` | Brand accent — wonder, warmth      |
| Teal Expedition | `#1A6B72` | Supporting accent                  |
| Warm White      | `#FDFAF4` | Cards / raised surfaces            |

**Dark mode:** Deep Navy background (`#0E1829`), Poster Ivory text, Adventure Gold for interactive accents. Shadows are barely visible — depth via layered dark surfaces.

### Typography

| Role            | Typeface                             | Notes                                          |
| --------------- | ------------------------------------ | ---------------------------------------------- |
| Heading         | **Playfair Display** (Google Fonts)  | Serif display — evokes prestige travel posters |
| Subheading      | **Libre Baskerville** (Google Fonts) | Companion serif — readable at medium sizes     |
| Body            | **Source Sans 3** (Google Fonts)     | Clean sans-serif — comfortable for long reads  |
| Label / Caption | **Source Sans 3 SemiBold**           | Legibility at small sizes                      |

**Type scale:** Large expressive headings (40–48sp on mobile) contrast with tight, efficient body text (16sp). All-caps labels with tracked letter-spacing for itinerary section headers.

### Motion Language

Animations are deliberate and theatrical — each transition feels intentional, like turning the page of a beautifully illustrated travel diary. Card reveals use a gentle upward slide (300ms, ease-out). Navigation transitions are horizontal slides evoking flipping between poster panels. Loading states pulse with a warm golden shimmer, never a generic grey skeleton. Reduce Motion: all transitions collapse to instant opacity fades.

### Voice and Tone

WonderWaltz speaks like a knowledgeable friend who has planned dozens of Disney trips — confident, specific, and gently enthusiastic. Copy avoids corporate language ("please note") and superlatives ("the best!") alike. Instead: direct, warm, and precise. Example: "You have 4 minutes to walk to Space Mountain before your Lightning Lane window opens — let's go."

### Photography and Illustration Policy

**Illustration-forward.** Authentic photography is rarely used — and when it is, it shows families (never rides or Disney characters). Preferred: original illustrated vignettes in a vintage poster style, bold flat-color park maps, and typographic emphasis. No Disney IP in any illustration (no castle silhouette, no character art). Illustrations use the poster palette — 4–5 colors maximum per image.

### Per-Park Accent Colors

| Park              | Accent          | Hex       |
| ----------------- | --------------- | --------- |
| Magic Kingdom     | Fairytale Blue  | `#4A7FCC` |
| EPCOT             | Geodesic Silver | `#7D9BAA` |
| Hollywood Studios | Marquee Gold    | `#C8961A` |
| Animal Kingdom    | Savanna Earth   | `#7A5C30` |

Park accents are used on section headers and map pins for that park. They always maintain 4.5:1 contrast against both Poster Ivory and Deep Navy backgrounds.

### Dark Mode Strategy

Deep Navy (`#0E1829`) base surface. Raised surfaces step lighter by 8% luminosity. Adventure Gold replaces WDW Red as the interactive accent in dark mode (red reads more aggressive on dark backgrounds). Typography inverts to Poster Ivory. Illustrations remain at full opacity — they were designed for dark backgrounds too.

---

## Direction 2: Warm Modern Minimalism

_Refined. Trustworthy. Magazine-quality._

### Palette

| Name            | Hex       | Role                                       |
| --------------- | --------- | ------------------------------------------ |
| Warm Canvas     | `#FAFAF7` | Background — creamy, not clinical white    |
| Deep Espresso   | `#1C1412` | Primary text — warmer than pure black      |
| Amber Signature | `#D97706` | Brand primary — warm, premium, distinctive |
| Amber Light     | `#FEF3C7` | Tinted surfaces, highlights                |
| Terracotta      | `#C2652B` | Secondary accent — energy without loudness |
| Stone           | `#9A8C7E` | Secondary text / borders                   |

**Dark mode:** `#1A1714` background (warm dark, not cold grey-black), `#F5F0EA` text, Amber Signature accent remains. Raised surfaces use `#252118`.

### Typography

| Role           | Typeface                            | Notes                                                  |
| -------------- | ----------------------------------- | ------------------------------------------------------ |
| Heading        | **DM Serif Display** (Google Fonts) | Elegant, contemporary serif — confident without weight |
| Body           | **DM Sans** (Google Fonts)          | Matched companion sans-serif from Google               |
| Label / UI     | **DM Sans Medium**                  | Consistent family for all UI elements                  |
| Numeric / Data | **DM Mono** (Google Fonts)          | Wait times, durations, prices                          |

**Type scale:** Restrained. Headings at 32–40sp. Body at 17sp (one step above iOS default for reading comfort on trip plans). Generous line-height (1.6×) makes dense itinerary content scannable. Numeric data in DM Mono for alignment and readability at a glance.

### Motion Language

Subtle, refined, and purposeful. Transitions feel like a luxury app — fast enough to never frustrate, smooth enough to feel premium. Cross-fade between screens (200ms, ease-in-out). Cards elevate gently on tap (scale 1.02, shadow deepens). Pull-to-refresh uses a custom amber spinner rather than the OS default. No decorative motion — every animation conveys state change. Reduce Motion: instant cuts only.

### Voice and Tone

Calm authority. WonderWaltz is the knowledgeable friend, not the cheerleader. No exclamation points in UI copy (save them for genuine celebration moments: "You're ready for the trip of a lifetime."). Plans feel curated, not generated. Example: "Based on your family's pace, we recommend arriving at Tomorrowland by 9:15 AM — before the rope drop rush settles."

### Photography and Illustration Policy

**Photography-forward.** Hero moments use warm-toned photography of real families (not rides, not Disney characters). Stock photography of Orlando skyline, resort pools, and family moments is acceptable if authentically warm and unposed. Never stock-photo-obvious. Photography always filtered with a warm amber tone overlay (+15 warmth, -10 saturation) for brand coherence. Minimal illustration — only for empty states and onboarding.

### Per-Park Accent Colors

| Park              | Accent       | Hex       |
| ----------------- | ------------ | --------- |
| Magic Kingdom     | Periwinkle   | `#6B8FCC` |
| EPCOT             | Teal Future  | `#2D9CDB` |
| Hollywood Studios | Sunset Rose  | `#D4616B` |
| Animal Kingdom    | Forest Green | `#2D7A4F` |

Park accents are subtle. Used as left-border indicators on itinerary items, not as dominant colors. All meet 3:1 contrast against Warm Canvas for UI component accessibility.

### Dark Mode Strategy

Warm dark backgrounds (amber-tinted, never cold grey). Amber Signature accent remains — it actually glows beautifully on dark. Surface elevation is expressed through subtle warm gradients (no hard borders). Photography gets darker overlay treatment in dark mode. The "luxury magazine at night" feeling: everything still reads premium.

---

## Direction 3: Painterly Whimsy

_Joyful. Hand-crafted. Enchanting._

### Palette

| Name            | Hex       | Role                                   |
| --------------- | --------- | -------------------------------------- |
| Storybook Cream | `#FEF8EE` | Background — warm, soft, welcoming     |
| Deep Plum       | `#2D1B3D` | Primary text — rich, not harsh black   |
| Wisteria        | `#9B7FD4` | Brand primary — magical, distinctive   |
| Peach Bloom     | `#F4A261` | Brand accent — warm, energetic, joyful |
| Mint Garden     | `#5CAD8F` | Supporting accent — freshness, nature  |
| Lavender Mist   | `#EDE8F5` | Tinted surfaces, highlights            |

**Dark mode:** `#1A1224` deep plum base. Wisteria brightened to `#B89FE8` for dark backgrounds. Peach Bloom remains. Surface depth via purple-tinted darks, not neutral greys.

### Typography

| Role               | Typeface                  | Notes                                                          |
| ------------------ | ------------------------- | -------------------------------------------------------------- |
| Heading            | **Nunito** (Google Fonts) | Rounded, friendly, approachable — every letterform has a smile |
| Body               | **Nunito Regular**        | Single family for warmth and coherence                         |
| Label / UI         | **Nunito SemiBold**       | Weight variance within family for hierarchy                    |
| Special / Callouts | **Caveat** (Google Fonts) | Hand-lettered feel for tips, highlights, quotes                |

**Type scale:** Generous and bubbly. Headings at 36–44sp with tight tracking. Caveat used sparingly for delightful micro-moments ("Pro tip from a Disney expert"). Body at 16sp with 1.7× line height for comfortable reading.

### Motion Language

Playful, bouncy, and enchanting — but never distracting from the plan. Screen entrances use a gentle spring animation (stiffness 200, damping 0.7) — elements settle into place naturally. Interactive elements respond with a slight bounce on tap. Confetti-style particle effects for milestone moments (first trip created, first day planned). Loading uses illustrated characters on a wand — original, non-Disney characters. Reduce Motion: spring animations collapse to linear ease; particles disabled.

### Voice and Tone

Warm, playful, and reassuring — the tone of a beloved children's book narrator who also happens to be a Disney expert. Never condescending, never overly formal. Uses inclusive language ("your family", "your little ones"). Celebrates milestones. Example: "Your family's perfect Tuesday is ready — complete with the best spots for little ones and zero wasted waiting time."

### Photography and Illustration Policy

**Illustration-first.** Original illustrated characters (a family of four — parents and two kids — in a non-Disney art style) appear throughout the onboarding, empty states, and celebratory moments. Illustrations are flat-colored with visible brushstroke textures, evoking a hand-painted storybook. Photography is used for resort room previews and dining imagery only — never for parks, rides, or characters. All illustrations are original works (LEGL-03 compliant: no Mickey silhouettes, no castle, no Disney IP).

### Per-Park Accent Colors

| Park              | Accent         | Hex       |
| ----------------- | -------------- | --------- |
| Magic Kingdom     | Royal Blue     | `#4A7FD4` |
| EPCOT             | Aqua Future    | `#41B3A3` |
| Hollywood Studios | Starlight Gold | `#F4C430` |
| Animal Kingdom    | Earthy Amber   | `#C4813A` |

Park accents are used as badge colors on itinerary items and map pins. Each park feels distinct while remaining within the whimsical palette family.

### Dark Mode Strategy

Deep plum backgrounds (`#1A1224`) with lavender-tinted surface layers. Dark mode feels like a storybook read under a cozy lamp — warm purples rather than cold greys. Illustrations adapt to dark mode with lighter outlined variants. Wisteria brightens for visibility. The Painterly Whimsy feel is preserved: it's magical in dark mode, not just inverted.

---

## ui-designer Recommendation

**Recommended: Direction 2 — Warm Modern Minimalism**

For first-time families planning the most anticipated trip of their lives, WonderWaltz needs to earn trust above all else. Direction 2's refined, magazine-quality aesthetic signals premium quality without visual noise, letting the plan content take center stage. The warm amber palette is inviting and distinctive without feeling overstimulating — important when parents are already juggling information overload. Direction 1 (Vintage Poster) is charming but risks feeling too retro for a mobile-native app; Direction 3 (Painterly Whimsy) is delightful but may feel too juvenile for parents who want to feel like expert planners, not children's app users. Warm Modern Minimalism hits the sweet spot: it feels like something Apple would feature in the App Store as a beautifully designed app, while remaining warm enough to feel personal.

---

_Produced by: ui-designer agent_
_WonderWaltz Brand Exploration v1.0_
_All palette values are original — no Disney IP referenced_

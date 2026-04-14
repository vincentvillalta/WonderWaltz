# WonderWaltz Brand Direction

## Source of Truth: Figma Make

The canonical brand direction lives in the Figma Make file:
**https://www.figma.com/make/9FLYsReiTPAfLoKAjW3Ahz/WonderWaltz**

- File key: `9FLYsReiTPAfLoKAjW3Ahz`
- Owner: `vincentvillalta@me.com` — vincentvillalta's team (Pro)
- All brand decisions — palette, typography, motion, component specs — are
  made there first, then propagated to the codebase via Figma MCP.
- To read the latest design, call `get_design_context` with this fileKey.
- This doc captures tokens as they exist at the time of Plan 01-09 (2026-04-14).
  Re-run `pnpm --filter @wonderwaltz/design-tokens build` after any Figma Make
  update to re-sync.

## Brand Name

WonderWaltz — an unofficial, fan-made Walt Disney World trip planner for
first-time families. Not affiliated with The Walt Disney Company.

## Core Value

A first-time WDW visitor gets a plan that feels like a Disney expert made
it for them.

## Visual Direction

**Feel:** Premium, warm, trustworthy. Editorial rather than playful. Navy
and gold deliver quiet confidence; cream grounds everything in softness.
Per-park accent colors appear only where a specific park is being discussed.

**Approach:** Minimal illustration, lots of whitespace, serif display pairs
with a clean geometric UI sans. Motion is deliberate — ease-in-out, never
bouncy — to reinforce trust rather than whimsy.

## Typography

| Role    | Family    | Notes                                                 |
| ------- | --------- | ----------------------------------------------------- |
| Display | Fraunces  | Variable serif, opsz + wght axes. H1-H4, hero copy.   |
| UI      | Inter     | Variable sans, opsz + wght axes. Body, labels, input. |
| Base    | 16px      | `--font-size` on html                                 |
| Weights | 400 / 500 | `--font-weight-normal`, `--font-weight-medium`        |

Both fonts are loaded from Google Fonts in `src/styles/fonts.css` in the
Figma Make file. The web app (`apps/web`) imports the same fonts via the
generated `tokens.css`. Native apps (iOS/Android) embed the font files in
Phase 5 / Phase 7.

## Color Palette — Light Mode

| Token     | Hex                     | Role                                 |
| --------- | ----------------------- | ------------------------------------ |
| Navy      | `#1B2A4E`               | Primary, foreground, card-foreground |
| Gold      | `#E8B547`               | Secondary, accent, ring, chart-5     |
| Cream     | `#FAF6EF`               | Background, sidebar                  |
| White     | `#FFFFFF`               | Card, popover, input-background      |
| Muted     | `#E5DDD0`               | Muted surfaces                       |
| Muted Fg  | `#6B7A9E`               | Muted text                           |
| Border    | `rgba(27, 42, 78, 0.1)` | Hairlines                            |
| Switch Bg | `#D4C8B5`               | Toggle "off" state                   |
| Destruct. | `#E63946`               | Destructive actions, errors          |

## Per-Park Accents

Use these colors only when a specific park is being referenced — a day
header in the itinerary, a filter chip, a park badge. Never as the dominant
color of a screen.

| Park              | Hex               |
| ----------------- | ----------------- |
| Magic Kingdom     | `#FF6B9D` (pink)  |
| EPCOT             | `#00BFA5` (teal)  |
| Hollywood Studios | `#E63946` (red)   |
| Animal Kingdom    | `#06D6A0` (green) |

## Color Palette — Dark Mode (Warm Charcoal)

Warm Charcoal is the default dark mode. The Figma Make file includes a
`DarkModePaletteExplorer` that lets users pick alternative dark palettes
(persisted to `localStorage.wonderwaltz-dark-palette`). Only Warm Charcoal
is currently shipped with the app.

| Token       | Hex                              |
| ----------- | -------------------------------- |
| Background  | `#121212`                        |
| Foreground  | `#EAE4D9`                        |
| Card        | `#1E1E1E`                        |
| Primary     | `#E8B547` (gold stays prominent) |
| Primary Fg  | `#1E1E1E`                        |
| Muted       | `#2A2622` / fg `#B5AFA5`         |
| Accent      | `#D4A574`                        |
| Border      | `rgba(212, 165, 116, 0.12)`      |
| Destructive | `#FF7B89`                        |

## Motion

- **Ease:** ease-in-out, never spring-bouncy.
- **Duration:** 150ms for micro (hover, tap feedback); 250ms for component
  transitions; 400ms for page/sheet transitions. Never over 500ms.
- **Reduce Motion:** must be respected (`prefers-reduced-motion` on web,
  `UIAccessibility.isReduceMotionEnabled` on iOS). Replace translate/scale
  animations with crossfades.
- **Library:** `motion` (Framer Motion) on web, `withAnimation` on iOS,
  `AnimatedVisibility` on Android.

## Voice and Tone

- **Warm expert** — speaks like a trusted friend who has done the trip
  fifteen times. Confident, specific, never performative.
- **Short sentences** — plan content is scannable at a glance. No filler.
- **No Disney voice mimicry** — we are not Disney. We never write "pixie
  dust", "magical moments", or similar corporate Disney vocabulary.
- **Park-safe** — no trademarked ride names in marketing copy. In-app, ride
  names come from catalog seed data (attribution to queue-times.com).
- **Positive constraint** — phrase accessibility features as capabilities,
  not limitations. "Quiet-time friendly" beats "avoids loud attractions".

## Photography & Illustration Policy

- **Photography:** Original stock photography of Orlando and families only.
  No photos of Disney parks, rides, or characters. **Never** reuse images
  from Disney's site or Disney social media.
- **Illustration:** No Disney-adjacent imagery. No castles, no Mickey
  silhouettes, no character-like figures. Preferred style: geometric,
  abstract, color-forward. See `ICONOGRAPHY.md` for the icon library.
- **LEGL-03 compliance:** See `.planning/PROJECT.md` requirement LEGL-03.
  Every asset must be auditable to an original source we own or have
  licensed.

## Disclaimer Requirement (LEGL-02)

Every user-facing surface — iOS, Android, web marketing, web admin —
must display "WonderWaltz is an unofficial fan app. Not affiliated with
The Walt Disney Company." Web: in the footer. Native apps: in Settings.
Enforced at the API layer by `X-WW-Disclaimer` header (see Plan 01-10).

## Component & Screen Reference

Full React implementations of every screen live in the Figma Make file
under `src/app/components/`. Use `get_design_context` with the fileKey
and a screen name to pull the React reference when implementing iOS
(Phase 5) or Android (Phase 7).

Phase 1 (this phase) does NOT port these components. That happens in:

- **Phase 5:** iOS SwiftUI port, per-screen via Figma MCP reference
- **Phase 7:** Android Jetpack Compose port, same workflow
- **Phase 8:** Web marketing pages (not the app UI itself)

## Design Review Gate (DSGN-08)

Every UI PR must reference the Figma Make file frame it implements.
Reviewers compare the PR implementation to `get_design_context` output
for that frame. Deviations must be documented and approved.

The `ui-ux-designer` agent (`.claude/agents/ui-ux-designer/`) is available
to run reviews asynchronously, but the Figma Make file — not the agent —
is the authority.

---

_Last updated: 2026-04-14 — Plan 01-09_
_Canonical source: Figma Make `9FLYsReiTPAfLoKAjW3Ahz`_

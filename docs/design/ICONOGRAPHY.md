# Iconography — WonderWaltz

## Web: Lucide Icons

The Figma Make file uses `lucide-react@0.487.0` for all icons. We match
that choice for web consistency.

**License:** ISC — permissive, commercial use allowed
**Package (web):** `lucide-react`
**Why Lucide:** Matches the Figma Make reference exactly. Used across
every screen in the prototype. ~1400 icons.

## iOS / Android: Phosphor Icons

Phosphor is chosen for native platforms because it has first-party
iOS (`phosphor-swift`) and Android (`phosphor-android` / Compose) packages
with the same visual vocabulary as Lucide. Visual parity is close enough
that screens ported from Figma Make will look native on each platform.

**License:** MIT
**Packages:**

- iOS: `phosphor-swift` (Swift Package)
- Android: `phosphor-android` (XML drawables or Compose)

## Weight Usage (cross-platform)

| Context           | Weight           | Example                       |
| ----------------- | ---------------- | ----------------------------- |
| Navigation bar    | Regular          | Home, Search, Profile         |
| Action buttons    | Bold or Fill     | Add, Delete, Share            |
| Informational     | Light or Regular | Info badge, Help              |
| Status indicators | Fill             | Success ✓, Error ✗, Warning ⚠ |

Both Lucide and Phosphor support 4-5 weights with similar naming.

## Minimum Tap Targets

All icons used as interactive elements must meet:

- iOS: 44×44pt minimum touch target (icon may be 24×24pt with padding)
- Android: 48×48dp minimum touch target
- Web: 44×44px (following iOS HIG minimum as cross-platform floor)

## WDW-Specific Icon Mapping

| Concept              | Lucide (web)         | Phosphor (iOS/Android) |
| -------------------- | -------------------- | ---------------------- |
| Ride / Attraction    | `Ticket`             | `Ticket`               |
| Thrill ride          | `Zap`                | `Lightning`            |
| Dining (quick)       | `UtensilsCrossed`    | `ForkKnife`            |
| Dining (table)       | `Utensils`           | `ForkKnife` (bold)     |
| Show / Entertainment | `Theater`            | `MaskHappy`            |
| Walking / Navigation | `Footprints`         | `Footprints`           |
| Lightning Lane       | `Zap`                | `Lightning`            |
| Rest / Break         | `Coffee`             | `Coffee`               |
| Hotel / Resort       | `Bed` or `Building2` | `Bed`                  |
| Camera / Memory      | `Camera`             | `Camera`               |
| Calendar / Date      | `Calendar`           | `Calendar`             |
| Clock / Time         | `Clock`              | `Clock`                |
| Party / Guests       | `Users`              | `UsersThree`           |

## Custom Illustration Policy (LEGL-03)

**No Disney trademarks in any graphic asset.** This includes:

- No Mickey Mouse silhouettes (classic ears shape)
- No castle silhouettes or imagery
- No ride photography
- No character art
- No official park maps

Acceptable:

- Lucide / Phosphor icons as the primary visual vocabulary
- Abstract patterns suggesting magic, stars, confetti (original)
- Geometric shapes and color blocks
- Original stock photography of Orlando (non-park-specific)

---

_Web icons: Lucide (ISC) — matches Figma Make reference_
_Native icons: Phosphor (MIT)_
_Applies to: iOS (Phase 5), Android (Phase 7), Web (Phase 8)_
_Last updated: 2026-04-14 — Plan 01-09_

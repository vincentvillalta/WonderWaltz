# Accessibility — WonderWaltz

## Standard: WCAG 2.2 AA

All user-facing surfaces (iOS, Android, Web) must meet WCAG 2.2 Level AA.
Figma Make provides visual reference but DOES NOT guarantee accessibility —
every ported implementation must re-verify.

## Color Contrast

| Context                                | Minimum Ratio                       |
| -------------------------------------- | ----------------------------------- |
| Normal text (< 18pt or < 14pt bold)    | 4.5:1                               |
| Large text (≥ 18pt or ≥ 14pt bold)     | 3:1                                 |
| UI components, icons, focus indicators | 3:1                                 |
| Disabled states                        | No minimum (but must look disabled) |

**Verification:** Check every color pair from `tokens.json` using Stark
(Figma plugin) or a WCAG contrast tool. The Navy/Cream pair (`#1B2A4E`
on `#FAF6EF`) gives ~12:1 — well above AA. Gold on Cream (`#E8B547` on
`#FAF6EF`) gives ~2.1:1 — FAILS for text, **must only be used as a
background or large decorative element**, never for body text.

Never rely on color alone to convey information — add icons, labels,
or patterns.

## Tap Targets (iOS / Android)

- Minimum: 44×44pt (iOS HIG) / 48×48dp (Material Design 3)
- Recommended: 48×48pt (matches both HIG and Material)
- All interactive elements must meet this minimum
- Use padding, not resizing the visual element, to meet the minimum

## Focus Indicators (Web)

- Custom focus rings must have at least 3:1 contrast against adjacent colors
- Focus must not be obscured by sticky headers or floating elements
  (WCAG 2.2 SC 2.4.11 — Focus Not Obscured)
- Focus indicator must be 2px minimum thickness or equivalent area
  (WCAG 2.2 SC 2.4.13 — Focus Appearance)
- Tab order must follow reading order

## Target Size (WCAG 2.2 SC 2.5.8)

All pointer targets on web must be at least 24×24 CSS pixels, unless:

- The target is inline in a sentence
- A larger target exists nearby with equivalent function
- The user has explicitly adjusted target size in system settings

WonderWaltz mobile web view uses the 44px iOS minimum everywhere, which
exceeds this requirement.

## Dynamic Type

- **iOS:** Support `accessibility5` (largest accessibility text size)
  without clipping
  - Use `scaledFont(for:)` / `.font(.body)` in SwiftUI; test at
    `accessibility5` setting
  - No fixed heights on text containers — use `minHeight` with flexibility
- **Android:** Support largest Accessibility font scale
  - Use `sp` units for all text sizes (scales with system font size)
  - Test at 200% font scale

## VoiceOver (iOS) and TalkBack (Android)

- Every interactive element must have an accessibility label
- Decorative images: `accessibilityHidden = true` / `contentDescription = null`
- Custom controls must declare accessibility role
- Grouped items should be combined (reduce VoiceOver swipe count)
- Test every screen with VoiceOver/TalkBack from first implementation
- The Figma Make React code does NOT include these labels — they must
  be added when porting to native

## Reduce Motion

Check `UIAccessibility.isReduceMotionEnabled` (iOS) / `prefers-reduced-motion`
(web CSS) / `Settings.Global.TRANSITION_ANIMATION_SCALE` (Android) before
running animations. Replace translate/scale transitions with crossfades.
WonderWaltz uses SwiftUI's `withAnimation` — test all animated transitions
with reduce motion on.

## Dragging Alternatives (WCAG 2.2 SC 2.5.7)

Any interaction that requires dragging must have a tap/button alternative:

- Scrollable lists: additional "scroll to top" button if list is very long
- Reorderable items (e.g., plan re-ordering): handle tap to focus → move
  up/move down buttons
- Range sliders: manual text input fallback
- Swipeable cards (`SwipeableCard.tsx` in Figma Make): tap-to-select
  fallback with like/skip buttons

## Consistent Help (WCAG 2.2 SC 3.2.6)

Help mechanisms (support link, FAQ, help icon) must appear in the same
relative order on every screen where they exist. WonderWaltz places
"Help" in the Profile tab footer consistently.

## Authentication (WCAG 2.2 SC 3.3.8)

Sign-in must not require a cognitive function test (e.g., remembering
passwords without a password manager). WonderWaltz uses:

- Sign in with Apple
- Sign in with Google
- Magic link via email
  All three avoid cognitive test requirements.

---

_Standard: WCAG 2.2 Level AA_
_Applies to: iOS (Phase 5), Android (Phase 7), Web (Phase 8)_
_Last updated: 2026-04-14 — Plan 01-09_

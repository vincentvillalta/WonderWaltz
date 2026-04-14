# Component Catalog — WonderWaltz

> The canonical component catalog lives in the **Figma Make file**
> (`9FLYsReiTPAfLoKAjW3Ahz`) under `src/app/components/`. This file
> summarizes what exists there and how it maps to native platforms.

## Source of Truth

Every shared UI component has a React reference in the Figma Make file.
Pull the latest with:

```
get_design_context(fileKey="9FLYsReiTPAfLoKAjW3Ahz", nodeId="")
```

## Shipped Screens (in Figma Make)

| Screen                     | File                                     | Notes                             |
| -------------------------- | ---------------------------------------- | --------------------------------- |
| Onboarding                 | `components/Onboarding.tsx`              | First-run flow                    |
| Trip Setup                 | `components/TripSetup.tsx`               | Wizard: dates, party, prefs       |
| Trips Home                 | `components/TripsHome.tsx`               | Trip list                         |
| Itinerary                  | `components/Itinerary.tsx`               | Day-by-day plan view              |
| Live Day                   | `components/LiveDay.tsx`                 | In-park active day                |
| Profile                    | `components/Profile.tsx`                 | Account + settings root           |
| Account Settings           | `components/AccountSettings.tsx`         |                                   |
| Notification Settings      | `components/NotificationSettings.tsx`    |                                   |
| Subscription               | `components/SubscriptionScreen.tsx`      | IAP status + restore purchases    |
| Party Members              | `components/PartyMembersScreen.tsx`      | Guest list mgmt                   |
| Tab Bar                    | `components/TabBar.tsx`                  | Bottom nav                        |
| Paywall Sheet              | `components/PaywallSheet.tsx`            | StoreKit paywall modal            |
| Navigation Sheet           | `components/NavigationSheet.tsx`         | Walking directions between stops  |
| Stop Detail Sheet          | `components/StopDetailSheet.tsx`         | Attraction/dining detail          |
| Swap Attraction Sheet      | `components/SwapAttractionSheet.tsx`     | Replace a plan item               |
| Swipeable Card             | `components/SwipeableCard.tsx`           | Tinder-style ride picker          |
| Dark Mode Toggle           | `components/DarkModeToggle.tsx`          | Settings row                      |
| Dark Mode Palette Explorer | `components/DarkModePaletteExplorer.tsx` | User picks alternate dark palette |

## UI Primitives (shadcn/ui based)

Under `components/ui/` in the Figma Make file — ~50 Radix-based primitives
(Button, Card, Dialog, Sheet, Tabs, Tooltip, etc.). When implementing iOS
or Android, these map to native equivalents; we do not port them
component-for-component.

## Platform Mapping

| Figma Make Component | iOS (Phase 5)      | Android (Phase 7)    | Web (Phase 8)     |
| -------------------- | ------------------ | -------------------- | ----------------- |
| `ui/button.tsx`      | `SwiftUI.Button`   | `Button` (M3)        | shadcn Button     |
| `ui/card.tsx`        | Custom `Card` view | `Card` (M3)          | shadcn Card       |
| `ui/sheet.tsx`       | `.sheet`           | `ModalBottomSheet`   | shadcn Sheet      |
| `ui/tabs.tsx`        | `TabView`          | `TabRow` (M3)        | shadcn Tabs       |
| `TabBar.tsx`         | `TabView` (root)   | `NavigationBar` (M3) | N/A (mobile only) |
| `Itinerary.tsx`      | Custom list view   | `LazyColumn`         | Mobile web view   |
| `PaywallSheet.tsx`   | StoreKit 2 sheet   | Play Billing flow    | N/A               |

## Required Component States

Every interactive component must implement:

- **Default** — resting state
- **Hover** (web only) — pointer over
- **Pressed/Active** — touch/click in progress
- **Focused** — keyboard / VoiceOver / TalkBack focus ring
- **Loading** — skeleton or spinner while data loads
- **Empty** — no data (empty trip list, no rides matching filter)
- **Error** — failure state with retry option
- **Disabled** — interaction blocked with visual indicator

## Dependency Notes (from Figma Make package.json)

Not all of these get imported into our monorepo. Reviewed choices:

- **Keep:** `motion` (Framer Motion), `sonner` (toasts), `lucide-react`
  (icons for web), `tailwind-merge`, `class-variance-authority`, `clsx`,
  Radix primitives, `date-fns`, `react-day-picker`, `react-hook-form`,
  `recharts`, `vaul` (drawer), `cmdk` (command palette).
- **Drop:** `@mui/material`, `@mui/icons-material`, `@emotion/*`. These
  are Figma Make scaffold defaults; we use shadcn/ui + Tailwind instead.
- **Drop:** `react-slick`, `react-responsive-masonry`. Not needed for MVP.
- **Evaluate:** `react-dnd`, `react-dnd-html5-backend`. Used by
  SwapAttractionSheet — may be worth it for web; native apps do drag
  differently.

## Review Gate (DSGN-08)

Every UI PR must name the Figma Make frame it implements. Reviewers
compare the PR's implementation to the Figma Make output via:

```
get_design_context(fileKey="9FLYsReiTPAfLoKAjW3Ahz", nodeId="<frame-id>")
```

Deviations from the reference must be documented in the PR description.

---

_Canonical source: Figma Make `9FLYsReiTPAfLoKAjW3Ahz`_
_Last updated: 2026-04-14 — Plan 01-09_

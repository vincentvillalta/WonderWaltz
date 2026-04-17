---
phase: 05-ios-core
plan: 11
subsystem: ui
tags: [swiftui, plan-view, swipe-gestures, bottom-sheet, park-colors, timeline]

requires:
  - phase: 05-ios-core/08
    provides: WWDesignSystem ParkColor, WWEmptyState, WWButton, WWCard components
provides:
  - DayPillPicker with park-color bordered horizontal scrollable pills
  - Swipeable PlanItemCard with park-colored icons, LL/ADR badges, drag handles
  - DayTimelineView with park-colored connector lines and staggered animations
  - PlanItemDetailView bottom sheet with spring animation matching StopDetailSheet.tsx
  - PlanViewModel skip/done/parkColor APIs
affects: [05-ios-core, 06-ios-polish]

tech-stack:
  added: []
  patterns: [swipeable-card-drag-gesture, custom-bottom-sheet-overlay, park-color-mapping, staggered-appearance-modifier]

key-files:
  created:
    - apps/ios/Packages/WWPlanView/Sources/WWPlanView/DayPillPicker.swift
  modified:
    - apps/ios/Packages/WWPlanView/Sources/WWPlanView/PlanContainerView.swift
    - apps/ios/Packages/WWPlanView/Sources/WWPlanView/PlanItemCard.swift
    - apps/ios/Packages/WWPlanView/Sources/WWPlanView/PlanItemDetailView.swift
    - apps/ios/Packages/WWPlanView/Sources/WWPlanView/DayTimelineView.swift
    - apps/ios/Packages/WWPlanView/Sources/WWPlanView/PlanViewModel.swift
    - apps/ios/WonderWaltzTests/PlanViewTests.swift

key-decisions:
  - "DayTabPicker replaced entirely by DayPillPicker (file deleted)"
  - "PlanItemDetailView rewritten as custom overlay (not .sheet) for spring animation control"
  - "isADR field added to PlanItemData model for ADR badge support"
  - "PlanItemDetailView written in Task 1 (not Task 2) for build compatibility"

patterns-established:
  - "Park-color mapping: PlanViewModel.parkColor(for:) normalizes parkName to ParkColor enum"
  - "Swipeable card: DragGesture with 100pt threshold, spring snap-back"
  - "Custom bottom sheet: ZStack overlay with backdrop, spring offset animation, drag-to-dismiss"
  - "Staggered appearance: ViewModifier with index * 0.03s delay, gated on reduceMotion"

requirements-completed: [IOS-07, IOS-17]

duration: 10min
completed: 2026-04-17
---

# Phase 5 Plan 11: Plan View Design Alignment Summary

**Rewrote WWPlanView to match React Itinerary.tsx + StopDetailSheet.tsx with horizontal day pills, park-colored swipeable timeline cards, and spring-animated bottom sheet detail**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-17T14:26:10Z
- **Completed:** 2026-04-17T14:36:30Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Horizontal scrollable day pills with park-color borders replacing old tab-style picker
- Swipeable timeline cards with park-colored 36pt icons, LL/ADR badges, drag handles, connector lines at 20% opacity
- Custom bottom sheet detail with spring animation, park-color time badge, hero gradient, height req card, Pro Tip gold card, walk time card, navy Start Navigation CTA
- PlanViewModel extended with skip/done tracking, parkColor mapping, isADR model field
- 16 PlanViewTests pass including new skip/done/parkColor tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite DayPillPicker + PlanContainerView + PlanItemCard + detail** - `501f466` (feat)
2. **Task 2: Update PlanViewTests** - `7d1dcfc` (test)

## Files Created/Modified
- `DayPillPicker.swift` - Horizontal scrollable day pills with park-color borders (new, replacing DayTabPicker)
- `PlanContainerView.swift` - Root plan view with Fraunces header, hint banner, empty state, detail overlay
- `PlanItemCard.swift` - Swipeable timeline card with park-colored icon, badges, drag handle
- `PlanItemDetailView.swift` - Bottom sheet detail with spring animation matching StopDetailSheet.tsx
- `DayTimelineView.swift` - Timeline with park-colored connector lines and staggered animations
- `PlanViewModel.swift` - Added skippedItems, skipItem, markDone, parkColor, isADR
- `PlanViewTests.swift` - Added skip/done/parkColor tests (16 total, all pass)
- `DayTabPicker.swift` - Deleted (replaced by DayPillPicker)

## Decisions Made
- DayTabPicker replaced entirely by DayPillPicker (file deleted, not renamed) -- cleaner break from tab-style to pill-style
- PlanItemDetailView implemented as custom ZStack overlay instead of .sheet modifier for spring animation control per StopDetailSheet.tsx
- isADR field added to PlanItemData with backward-compatible default (false) -- existing JSON without isADR still decodes
- PlanItemDetailView written in Task 1 instead of Task 2 because PlanContainerView references it and must compile

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] PlanItemDetailView written in Task 1 instead of Task 2**
- **Found during:** Task 1 (build verification)
- **Issue:** PlanContainerView.swift references PlanItemDetailView with new API signature; build fails without it
- **Fix:** Wrote complete PlanItemDetailView in Task 1 alongside other view files
- **Files modified:** PlanItemDetailView.swift
- **Verification:** xcodebuild build succeeds
- **Committed in:** 501f466 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Task reordering for build compatibility. No scope change.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan view fully aligned with React reference design
- Phase 05-ios-core plan 11 is the final plan -- phase complete
- Ready for Phase 06 iOS polish work

---
*Phase: 05-ios-core*
*Completed: 2026-04-17*

---
phase: 05-ios-core
plan: 05
subsystem: ui
tags: [swiftui, observation, plan-view, timeline, notification-permission, offline-cache]

requires:
  - phase: 05-ios-core
    provides: WWCore protocols (APIClientProtocol, OfflineStoreProtocol, AnalyticsProtocol), WWDesignSystem components (WWCard, WWBlurOverlay, WWButton, Typography, Theme)
provides:
  - WWPlanView package with PlanContainerView, PlanViewModel, DayTabPicker, DayTimelineView
  - PlanItemCard polymorphic for 6 item types (attraction, meal, show, LL reminder, rest, walk)
  - PlanItemDetailView with mark-as-done toggle and map placeholder
  - RethinkLoadingView with dimmed overlay and reduce-motion support
  - LockedDayOverlay with blur and unlock CTA placeholder
  - ForecastBanner dismissible beta framing (FC-05)
  - Notification permission request after first plan load (CONTEXT.md locked decision)
  - PlanViewTests (12 tests) covering load, cache fallback, day selection, notification guard, rethink
affects: [05-06, 05-07, 06-ios-features]

tech-stack:
  added: []
  patterns: [injectable-notification-authorization, polymorphic-plan-item-card, timeline-with-walking-connectors]

key-files:
  created:
    - apps/ios/Packages/WWPlanView/Sources/WWPlanView/PlanViewModel.swift
    - apps/ios/Packages/WWPlanView/Sources/WWPlanView/PlanContainerView.swift
    - apps/ios/Packages/WWPlanView/Sources/WWPlanView/DayTabPicker.swift
    - apps/ios/Packages/WWPlanView/Sources/WWPlanView/ForecastBanner.swift
    - apps/ios/Packages/WWPlanView/Sources/WWPlanView/DayTimelineView.swift
    - apps/ios/Packages/WWPlanView/Sources/WWPlanView/PlanItemCard.swift
    - apps/ios/Packages/WWPlanView/Sources/WWPlanView/PlanItemDetailView.swift
    - apps/ios/Packages/WWPlanView/Sources/WWPlanView/RethinkLoadingView.swift
    - apps/ios/Packages/WWPlanView/Sources/WWPlanView/LockedDayOverlay.swift
    - apps/ios/WonderWaltzTests/PlanViewTests.swift
  modified:
    - apps/ios/WonderWaltz.xcodeproj/project.pbxproj

key-decisions:
  - "Injectable notification authorization closure instead of direct UNUserNotificationCenter -- enables test isolation without system dialogs"
  - "PlanData/PlanDayData/PlanItemData models defined in PlanViewModel.swift -- keeps WWPlanView self-contained without cross-package model dependency"
  - "Walk items filtered from timeline display, shown as inline walking indicators between cards -- per CONTEXT.md walking times design"

patterns-established:
  - "Injectable system API pattern: notification permission via closure parameter with real default, mock in tests"
  - "Polymorphic card pattern: single PlanItemCard view handles all 6 item types via switch on PlanItemType enum"
  - "Timeline connector pattern: vertical line with walking time capsule badges between items"

requirements-completed: [IOS-07]

duration: 47min
completed: 2026-04-17
---

# Phase 5 Plan 5: Plan View Summary

**WWPlanView package with scrollable day timeline, 6 polymorphic item card types, rethink overlay, locked day blur, forecast banner, and notification permission after first plan load**

## Performance

- **Duration:** 47 min
- **Started:** 2026-04-17T12:05:58Z
- **Completed:** 2026-04-17T12:53:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Complete plan viewing experience: PlanContainerView with day tabs, timeline, and all item card types
- PlanViewModel with API-first/cache-fallback loading, rethink flow, and notification permission guard
- All 6 item types render with correct visual treatment: attraction (gold), meal (green), show (navy), LL reminder (warning), rest (muted), walk (inline connector)
- Rethink loading with dimmed plan overlay, spring animation, reduce-motion accessibility support
- Locked day overlay with blur and unlock CTA using WWBlurOverlay design system component
- ForecastBanner dismissible beta framing satisfying FC-05
- 12 PlanViewTests all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: PlanContainerView + PlanViewModel + DayTabPicker + ForecastBanner + Tests** - `3b6a9fe` (feat)
2. **Task 2: DayTimelineView + PlanItemCard + PlanItemDetailView + RethinkLoadingView + LockedDayOverlay** - `0be6d0f` (feat)

## Files Created/Modified
- `apps/ios/Packages/WWPlanView/Sources/WWPlanView/PlanViewModel.swift` - @Observable view model with plan loading, rethink, notification permission
- `apps/ios/Packages/WWPlanView/Sources/WWPlanView/PlanContainerView.swift` - Root plan view with day tabs, timeline, rethink button
- `apps/ios/Packages/WWPlanView/Sources/WWPlanView/DayTabPicker.swift` - Horizontal scrollable day tab bar with lock icons
- `apps/ios/Packages/WWPlanView/Sources/WWPlanView/ForecastBanner.swift` - Dismissible beta forecast banner
- `apps/ios/Packages/WWPlanView/Sources/WWPlanView/DayTimelineView.swift` - Scrollable timeline with walking indicators
- `apps/ios/Packages/WWPlanView/Sources/WWPlanView/PlanItemCard.swift` - Polymorphic card for all 6 item types
- `apps/ios/Packages/WWPlanView/Sources/WWPlanView/PlanItemDetailView.swift` - Full detail view with mark-as-done
- `apps/ios/Packages/WWPlanView/Sources/WWPlanView/RethinkLoadingView.swift` - Inline loading overlay with reduce-motion support
- `apps/ios/Packages/WWPlanView/Sources/WWPlanView/LockedDayOverlay.swift` - Blur overlay with unlock CTA
- `apps/ios/WonderWaltzTests/PlanViewTests.swift` - 12 unit tests for PlanViewModel
- `apps/ios/WonderWaltz.xcodeproj/project.pbxproj` - Added PlanViewTests to test target

## Decisions Made
- Injectable notification authorization closure instead of direct UNUserNotificationCenter -- real UNUserNotificationCenter.requestAuthorization hangs in test simulator, injectable closure enables test isolation
- PlanData/PlanDayData/PlanItemData models defined in PlanViewModel.swift -- keeps WWPlanView self-contained; avoids cross-package model dependencies
- Walk items filtered from timeline display, shown as inline walking indicators between cards -- per CONTEXT.md walking times design

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] PlanViewTests.swift not discovered by Xcode test runner**
- **Found during:** Task 1 (test verification)
- **Issue:** New test file was created on disk but not referenced in project.pbxproj, so Xcode reported 0 tests executed
- **Fix:** Added PBXBuildFile, PBXFileReference, PBXGroup child, and PBXSourcesBuildPhase entries for PlanViewTests.swift
- **Files modified:** apps/ios/WonderWaltz.xcodeproj/project.pbxproj
- **Verification:** 12 tests execute and pass
- **Committed in:** 3b6a9fe (Task 1 commit)

**2. [Rule 1 - Bug] Async tests hanging due to UNUserNotificationCenter.requestAuthorization**
- **Found during:** Task 1 (test verification)
- **Issue:** Tests calling loadPlan triggered real UNUserNotificationCenter.requestAuthorization which blocks waiting for system dialog in simulator, causing tests to report "started" but never "passed"
- **Fix:** Made notification authorization injectable via closure parameter with real default; tests inject `{ true }` mock
- **Files modified:** PlanViewModel.swift, PlanViewTests.swift
- **Verification:** All 12 tests pass in under 0.04 seconds
- **Committed in:** 3b6a9fe (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for test execution. Injectable notification pattern improves testability. No scope creep.

## Issues Encountered
- iPhone 16 simulator name not found by xcodebuild -- used booted iPhone 16 Pro simulator ID instead

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- WWPlanView package complete and ready for integration in Phase 5 remaining plans
- LockedDayOverlay onUnlockTap closure ready for Phase 6 paywall integration
- Map placeholder in PlanItemDetailView ready for Phase 6 static map integration
- PlanViewModel rethink flow complete, ready for end-to-end testing

---
*Phase: 05-ios-core*
*Completed: 2026-04-17*

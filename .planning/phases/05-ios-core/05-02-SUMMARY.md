---
phase: 05-ios-core
plan: 02
subsystem: offline
tags: [swiftdata, swiftui, offline-first, sync, network-monitor, ios]

requires:
  - phase: 05-ios-core/01
    provides: WWCore protocols (OfflineStoreProtocol, APIClientProtocol), DependencyContainer
provides:
  - SwiftData models for offline plan/trip/catalog/walking-graph persistence
  - WizardDraft auto-save with step-level resume
  - OfflineStore conforming to OfflineStoreProtocol with background @ModelActor operations
  - SyncCoordinator for network-aware background refresh
  - OfflinePackageDownloader for post-plan-generation asset caching
  - Sendable data transfer types for cross-actor safety
affects: [05-ios-core, 06-ios-features, plan-view, trip-wizard, onboarding]

tech-stack:
  added: [SwiftData, NWPathMonitor, @ModelActor]
  patterns: [@ModelActor for background SwiftData, Sendable value types for cross-actor transfer, fetch-then-delete for cascade-safe clearing, compound key for uniqueness on iOS 17]

key-files:
  created:
    - apps/ios/Packages/WWOffline/Sources/WWOffline/Models/CachedTrip.swift
    - apps/ios/Packages/WWOffline/Sources/WWOffline/Models/CachedPlan.swift
    - apps/ios/Packages/WWOffline/Sources/WWOffline/Models/CachedPlanDay.swift
    - apps/ios/Packages/WWOffline/Sources/WWOffline/Models/CachedPlanItem.swift
    - apps/ios/Packages/WWOffline/Sources/WWOffline/Models/CachedAttraction.swift
    - apps/ios/Packages/WWOffline/Sources/WWOffline/Models/CachedWalkingEdge.swift
    - apps/ios/Packages/WWOffline/Sources/WWOffline/Models/WizardDraft.swift
    - apps/ios/Packages/WWOffline/Sources/WWOffline/ModelContainerConfig.swift
    - apps/ios/Packages/WWOffline/Sources/WWOffline/OfflineStore.swift
    - apps/ios/Packages/WWOffline/Sources/WWOffline/SyncCoordinator.swift
    - apps/ios/Packages/WWOffline/Sources/WWOffline/OfflinePackageDownloader.swift
    - apps/ios/WonderWaltzTests/OfflineTests.swift
    - apps/ios/WonderWaltzTests/OfflineSyncTests.swift
  modified:
    - apps/ios/WonderWaltz.xcodeproj/project.pbxproj

key-decisions:
  - "CachedWalkingEdge uses @Attribute(.unique) compoundKey string instead of #Unique macro -- #Unique requires iOS 18, deployment target is iOS 17"
  - "clearCache uses fetch-then-delete pattern (not modelContext.delete(model:)) -- batch delete triggers constraint violations on inverse relationships"
  - "OfflineStore uses @ModelActor for background SwiftData operations -- never blocks main thread"
  - "Static map tile download deferred to Phase 6 -- OfflinePackageDownloader only handles catalog subset + walking graph"

patterns-established:
  - "Sendable value types (CachedPlanData, WizardDraftData, etc.) for cross-actor data transfer -- @Model objects must never cross actor boundaries"
  - "Fetch-then-delete pattern for SwiftData cascade-safe clearing -- batch delete violates OTO inverse constraints"
  - "Compound key pattern (fromId::toId) for uniqueness on iOS 17 without #Unique macro"

requirements-completed: [IOS-04, IOS-18]

duration: 60min
completed: 2026-04-17
---

# Phase 5 Plan 2: WWOffline Package Summary

**SwiftData offline persistence layer with 7 @Model classes, SyncCoordinator with NWPathMonitor, OfflinePackageDownloader for catalog+graph caching, and 10 passing unit tests**

## Performance

- **Duration:** 60 min
- **Started:** 2026-04-17T10:26:41Z
- **Completed:** 2026-04-17T11:26:41Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Complete SwiftData model layer (CachedTrip, CachedPlan, CachedPlanDay, CachedPlanItem, CachedAttraction, CachedWalkingEdge, WizardDraft) with cascade relationships
- OfflineStore conforming to OfflineStoreProtocol with @ModelActor background operations and Sendable data transfer types
- SyncCoordinator with NWPathMonitor network monitoring, stale-data detection (>1h threshold), and user-prompted refresh on significant changes
- OfflinePackageDownloader for post-plan-generation catalog subset + walking graph caching (no static maps)
- 10 unit tests passing: OfflineTests (6) + OfflineSyncTests (4)

## Task Commits

Each task was committed atomically:

1. **Task 1: SwiftData models + WizardDraft + ModelContainerConfig** - `c29717c` (feat)
2. **Task 2: SyncCoordinator + OfflinePackageDownloader + OfflineStore + tests** - `a8ae13f` (feat)

## Files Created/Modified
- `apps/ios/Packages/WWOffline/Sources/WWOffline/Models/CachedTrip.swift` - @Model for persisted trip with cascade to plans
- `apps/ios/Packages/WWOffline/Sources/WWOffline/Models/CachedPlan.swift` - @Model for persisted plan with cascade to days
- `apps/ios/Packages/WWOffline/Sources/WWOffline/Models/CachedPlanDay.swift` - @Model for plan day with cascade to items
- `apps/ios/Packages/WWOffline/Sources/WWOffline/Models/CachedPlanItem.swift` - @Model for plan item (attraction/meal/show/etc.)
- `apps/ios/Packages/WWOffline/Sources/WWOffline/Models/CachedAttraction.swift` - @Model for catalog attraction subset
- `apps/ios/Packages/WWOffline/Sources/WWOffline/Models/CachedWalkingEdge.swift` - @Model for walking graph edge with compound key
- `apps/ios/Packages/WWOffline/Sources/WWOffline/Models/WizardDraft.swift` - @Model for wizard auto-save with step resume
- `apps/ios/Packages/WWOffline/Sources/WWOffline/ModelContainerConfig.swift` - Factory for persistent/in-memory containers
- `apps/ios/Packages/WWOffline/Sources/WWOffline/OfflineStore.swift` - @ModelActor conforming to OfflineStoreProtocol + Sendable DTOs
- `apps/ios/Packages/WWOffline/Sources/WWOffline/SyncCoordinator.swift` - @Observable network monitor + sync orchestration
- `apps/ios/Packages/WWOffline/Sources/WWOffline/OfflinePackageDownloader.swift` - Background asset downloader (catalog + walking graph)
- `apps/ios/WonderWaltzTests/OfflineTests.swift` - 6 tests for cache + wizard draft persistence
- `apps/ios/WonderWaltzTests/OfflineSyncTests.swift` - 4 tests for sync logic + refresh prompt
- `apps/ios/WonderWaltz.xcodeproj/project.pbxproj` - Added test files to test target

## Decisions Made
- CachedWalkingEdge uses `@Attribute(.unique) compoundKey` string pattern instead of `#Unique` macro (requires iOS 18, deployment target is iOS 17)
- Fetch-then-delete pattern for `clearCache()` instead of `modelContext.delete(model:)` batch delete (batch delete triggers constraint violations on inverse relationships in SwiftData)
- Static map tile download deferred to Phase 6 per plan specification
- SyncCoordinator prompts user before refresh on significant changes (never auto-refresh per CONTEXT.md)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed #Unique macro iOS 18 availability**
- **Found during:** Task 1 (SwiftData models)
- **Issue:** `#Unique<CachedWalkingEdge>` requires iOS 18 but deployment target is iOS 17
- **Fix:** Replaced with `@Attribute(.unique) var compoundKey: String` using "fromId::toId" pattern
- **Files modified:** CachedWalkingEdge.swift
- **Verification:** Build succeeds on iOS 17 target
- **Committed in:** c29717c

**2. [Rule 1 - Bug] Fixed batch delete constraint violations in clearCache**
- **Found during:** Task 2 (OfflineStore tests)
- **Issue:** `modelContext.delete(model:)` uses batch delete which triggers "mandatory OTO nullify inverse" constraint violations on relationship chains
- **Fix:** Changed to fetch-then-delete pattern (individual object deletion respects cascade rules)
- **Files modified:** OfflineStore.swift
- **Verification:** testClearCacheRemovesAllData passes
- **Committed in:** a8ae13f

**3. [Rule 1 - Bug] Fixed mock API shouldThrow affecting getTrip in fresh-data test**
- **Found during:** Task 2 (OfflineSyncTests)
- **Issue:** Single `shouldThrow` flag affected both `getTrip` and `getPlan`, causing getTrip to throw before reaching staleness check
- **Fix:** Split into `shouldThrowOnGetTrip` and `shouldThrowOnGetPlan` flags, added `getPlanCallCount` assertion
- **Files modified:** OfflineSyncTests.swift
- **Verification:** testSyncIfNeededSkipsWhenDataIsFresh passes
- **Committed in:** a8ae13f

---

**Total deviations:** 3 auto-fixed (3 bugs)
**Impact on plan:** All auto-fixes necessary for correctness on iOS 17 target and test accuracy. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Offline persistence layer complete, ready for plan view (05-03) and wizard (05-04) integration
- OfflineStoreProtocol conformance enables DI via DependencyContainer
- SyncCoordinator ready for app lifecycle integration
- Static map tiles deferred to Phase 6

---
*Phase: 05-ios-core*
*Completed: 2026-04-17*

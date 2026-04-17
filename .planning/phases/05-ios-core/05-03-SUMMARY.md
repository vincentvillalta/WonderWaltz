---
phase: 05-ios-core
plan: 03
subsystem: ui
tags: [swiftui, onboarding, splash, di, sentry, posthog, swift-concurrency]

requires:
  - phase: 05-ios-core/01
    provides: WWCore protocols (AuthServiceProtocol, DependencyContainer, APIClient)
  - phase: 05-ios-core/02
    provides: WWOffline ModelContainerConfig, WWAnalytics CrashReportingService/PostHogAnalyticsService

provides:
  - App shell (WonderWaltzApp entry point with Sentry/PostHog init)
  - DI wiring (DISetup.makeContainer with all concrete implementations)
  - AppState driving splash -> onboarding -> main navigation
  - AppRouter with route switching and auth banner overlay
  - SplashView with silent anonymous auth
  - OnboardingContainerView with 4 swipeable pages
  - OnboardingViewModel with page management
  - OnboardingTests (9 tests passing)

affects: [05-ios-core/04, 05-ios-core/05, 06-ios-features]

tech-stack:
  added: [swift-http-types (explicit dep for linker resolution)]
  patterns: [MainActor.assumeIsolated for App.init DI wiring, taskGroup for concurrent splash operations, @retroactive protocol conformance bridge for cross-package protocol adoption]

key-files:
  created:
    - apps/ios/WonderWaltz/App/AppState.swift
    - apps/ios/WonderWaltz/App/AppConfig.swift
    - apps/ios/WonderWaltz/App/AppRouter.swift
    - apps/ios/WonderWaltz/App/DISetup.swift
    - apps/ios/WonderWaltz/App/AnalyticsBridge.swift
    - apps/ios/Packages/WWOnboarding/Sources/WWOnboarding/SplashView.swift
    - apps/ios/Packages/WWOnboarding/Sources/WWOnboarding/OnboardingContainerView.swift
    - apps/ios/Packages/WWOnboarding/Sources/WWOnboarding/OnboardingPageView.swift
    - apps/ios/Packages/WWOnboarding/Sources/WWOnboarding/OnboardingViewModel.swift
    - apps/ios/WonderWaltzTests/OnboardingTests.swift
  modified:
    - apps/ios/WonderWaltz/WonderWaltzApp.swift
    - apps/ios/WonderWaltz.xcodeproj/project.pbxproj
    - apps/ios/Packages/WWCore/Package.swift

key-decisions:
  - "MainActor.assumeIsolated in App.init for DI wiring -- App.init runs on main thread but is nonisolated in Swift 6"
  - "AnalyticsBridge with @retroactive conformance -- PostHogAnalyticsService cannot import WWCore directly (circular dep)"
  - "AppConfig reads DSN/API keys from Info.plist -- never hardcoded per security requirements"
  - "swift-http-types added as explicit WWCore dependency -- transitive dep not resolved by Xcode linker for test target"
  - "All host app package deps added to test target -- Xcode SPM requires explicit transitive graph for test linking"

patterns-established:
  - "DI factory pattern: DISetup.makeContainer() is the single place creating concrete types"
  - "AppState.AppRoute enum-driven navigation via @Observable"
  - "taskGroup splash pattern: auth and minimum display time run concurrently"
  - "@retroactive bridge conformances in app target for cross-package protocol adoption"

requirements-completed: [IOS-05]

duration: 16min
completed: 2026-04-17
---

# Phase 5 Plan 3: App Shell + Onboarding Summary

**Launchable app shell with DI wiring, splash screen with silent auth, and 4-page onboarding flow with 9 passing tests**

## Performance

- **Duration:** 16 min
- **Started:** 2026-04-17T11:30:27Z
- **Completed:** 2026-04-17T11:46:29Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- App launches with Sentry + PostHog initialized before first view, DI container wired via DISetup
- Splash screen performs silent anonymous auth concurrently with 1.5s brand impression timer
- Four onboarding pages (value prop, wizard preview, plan preview, offline) with skip and page indicators
- OnboardingTests: 9 tests covering page navigation, skip, completion callbacks -- all green

## Task Commits

Each task was committed atomically:

1. **Task 1: App shell -- WonderWaltzApp + AppState + AppRouter + DI wiring** - `9e120a9` (feat)
2. **Task 2: WWOnboarding -- splash with silent auth + onboarding screens + OnboardingTests** - `250d068` (feat)

## Files Created/Modified
- `apps/ios/WonderWaltz/WonderWaltzApp.swift` - App entry point with Sentry/PostHog init, DI wiring, ModelContainer
- `apps/ios/WonderWaltz/App/AppState.swift` - Observable root state with AppRoute enum driving navigation
- `apps/ios/WonderWaltz/App/AppConfig.swift` - Info.plist config reader for DSN/API keys
- `apps/ios/WonderWaltz/App/AppRouter.swift` - Route switch view with auth banner overlay + MainTabView placeholder
- `apps/ios/WonderWaltz/App/DISetup.swift` - Factory wiring KeychainStore, AuthService, APIClient, PostHog into DependencyContainer
- `apps/ios/WonderWaltz/App/AnalyticsBridge.swift` - @retroactive AnalyticsProtocol conformance for PostHogAnalyticsService
- `apps/ios/Packages/WWOnboarding/Sources/WWOnboarding/SplashView.swift` - Brand mark + taskGroup silent auth
- `apps/ios/Packages/WWOnboarding/Sources/WWOnboarding/OnboardingContainerView.swift` - TabView paged flow with skip/next/get started
- `apps/ios/Packages/WWOnboarding/Sources/WWOnboarding/OnboardingPageView.swift` - Reusable page template with Dynamic Type
- `apps/ios/Packages/WWOnboarding/Sources/WWOnboarding/OnboardingViewModel.swift` - Observable page state with advance/skip
- `apps/ios/WonderWaltzTests/OnboardingTests.swift` - 9 unit tests for OnboardingViewModel
- `apps/ios/Packages/WWCore/Package.swift` - Added swift-http-types explicit dep
- `apps/ios/WonderWaltz.xcodeproj/project.pbxproj` - Added App group, OnboardingTests, test target deps

## Decisions Made
- Used `MainActor.assumeIsolated` in `App.init` because the App struct body runs on MainActor but `init` is nonisolated in Swift 6 strict concurrency
- Created `AnalyticsBridge.swift` with `@retroactive AnalyticsProtocol` conformance since WWAnalytics cannot import WWCore (circular dependency)
- `AppConfig` reads all sensitive keys from Info.plist -- supports xcconfig-based configuration per environment
- Added `swift-http-types` as explicit dependency in WWCore's Package.swift to fix linker error when test target resolves WWCore's transitive dependency chain
- Added all host app package product dependencies to test target for proper Xcode SPM transitive resolution

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test target linker failure with HTTPTypes**
- **Found during:** Task 2 (OnboardingTests)
- **Issue:** Test target could not link WWCore because HTTPTypes (transitive dep via OpenAPIRuntime) was not resolved by Xcode's SPM linker
- **Fix:** Added swift-http-types as explicit dependency in WWCore Package.swift; added all host app packages to test target's package product dependencies
- **Files modified:** apps/ios/Packages/WWCore/Package.swift, apps/ios/WonderWaltz.xcodeproj/project.pbxproj
- **Verification:** `xcodebuild test -only-testing WonderWaltzTests/OnboardingTests` passes (9/9 tests)
- **Committed in:** 250d068 (Task 2 commit)

**2. [Rule 2 - Missing Critical] AppConfig for non-hardcoded secrets**
- **Found during:** Task 1 (WonderWaltzApp)
- **Issue:** Plan specified DSN/API keys "from Info.plist or Config.swift" but no config file existed
- **Fix:** Created AppConfig.swift reading all keys from Info.plist with safe defaults
- **Files modified:** apps/ios/WonderWaltz/App/AppConfig.swift
- **Verification:** Build succeeds, keys sourced from Info.plist
- **Committed in:** 9e120a9 (Task 1 commit)

**3. [Rule 2 - Missing Critical] AnalyticsBridge for protocol conformance**
- **Found during:** Task 1 (DI wiring)
- **Issue:** PostHogAnalyticsService doesn't conform to AnalyticsProtocol (circular dep prevents import in WWAnalytics)
- **Fix:** Created AnalyticsBridge.swift in app target with @retroactive conformance extension
- **Files modified:** apps/ios/WonderWaltz/App/AnalyticsBridge.swift
- **Verification:** Build succeeds, DependencyContainer accepts PostHogAnalyticsService as AnalyticsProtocol
- **Committed in:** 9e120a9 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (2 missing critical, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness and linking. No scope creep.

## Issues Encountered
- Swift 6 strict concurrency: `AuthService.init` is `@MainActor` so `DISetup.makeContainer()` needed `@MainActor` annotation, and `App.init` needed `MainActor.assumeIsolated` wrapper
- Xcode simulator name "iPhone 16" not available -- used device UUID targeting for builds

## User Setup Required

None - no external service configuration required. Sentry DSN and PostHog API key should be added to Info.plist when provisioned.

## Next Phase Readiness
- App shell is launchable with full splash -> onboarding -> main flow
- MainTabView is a placeholder ready for wizard (Plan 04) and plan view (Plan 05)
- DI container wired and available in environment for all child views
- OnboardingTests provide regression coverage for onboarding flow

---
*Phase: 05-ios-core*
*Completed: 2026-04-17*

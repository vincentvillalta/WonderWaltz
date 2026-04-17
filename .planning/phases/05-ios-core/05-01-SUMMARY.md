---
phase: 05-ios-core
plan: 01
subsystem: ios, architecture, ui
tags: [tuist, spm, swift-openapi-generator, sentry, posthog, keychain, swiftui, design-tokens]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Xcode project shell, design tokens, brand direction
  - phase: 04-entitlements-accounts
    provides: OpenAPI snapshot with all endpoints, anonymous auth
provides:
  - Tuist-managed iOS project with 7 SPM local packages
  - DI protocol system (APIClient, AuthService, Keychain, Analytics, OfflineStore)
  - DependencyContainer for protocol-based injection
  - Pre-generated OpenAPI client types from snapshot
  - WWDesignSystem with tokens, theme, typography, 4 reusable components
  - WWAnalytics with Sentry crash reporting + PostHog event capture
  - Age-data filtering on all analytics events (COPPA compliance)
  - String Catalog (Localizable.xcstrings) for i18n readiness
  - WonderWaltzTests target with DesignTokenTests + AnalyticsTests
affects: [05-ios-core, 06-ios-paywall]

# Tech tracking
tech-stack:
  added: [tuist 4.86, swift-openapi-runtime, swift-openapi-urlsession, sentry-cocoa 8.44.0, posthog-ios, KeychainAccess, phosphor-icons/swift]
  patterns: [protocol-based DI, pre-generated OpenAPI client, @Observable auth service, @MainActor protocol isolation, semantic color theme, Dynamic Type typography]

key-files:
  created:
    - apps/ios/Project.swift
    - apps/ios/Tuist/Package.swift
    - apps/ios/Packages/WWCore/Package.swift
    - apps/ios/Packages/WWCore/Sources/WWCore/DI/DependencyContainer.swift
    - apps/ios/Packages/WWCore/Sources/WWCore/Protocols/APIClientProtocol.swift
    - apps/ios/Packages/WWCore/Sources/WWCore/Generated/Client.swift
    - apps/ios/Packages/WWCore/Sources/WWCore/Generated/Types.swift
    - apps/ios/Packages/WWCore/Sources/WWCore/Networking/APIClient.swift
    - apps/ios/Packages/WWCore/Sources/WWCore/Auth/AuthService.swift
    - apps/ios/Packages/WWDesignSystem/Sources/WWDesignSystem/WWDesignTokens.swift
    - apps/ios/Packages/WWDesignSystem/Sources/WWDesignSystem/Theme.swift
    - apps/ios/Packages/WWDesignSystem/Sources/WWDesignSystem/Typography.swift
    - apps/ios/Packages/WWAnalytics/Sources/WWAnalytics/AnalyticsService.swift
    - apps/ios/WonderWaltzTests/DesignTokenTests.swift
    - apps/ios/WonderWaltzTests/AnalyticsTests.swift
  modified:
    - apps/ios/WonderWaltz.xcodeproj (deleted, replaced by Tuist)

key-decisions:
  - "Pre-generated OpenAPI client (CLI) instead of build plugin -- Tuist project generation conflicts with Xcode build tool plugin sandbox validation"
  - "sentry-cocoa pinned to exact 8.44.0 -- newer versions have Swift 6.2 manifest compilation error (String(cString:encoding:) API change)"
  - "AuthServiceProtocol marked @MainActor -- enables @Observable conformance without Sendable crossing isolation boundary"
  - "AnalyticsProtocol not Sendable -- PostHog SDK types are not Sendable; @unchecked Sendable on concrete class instead"
  - "WWDesignTokens rewritten as enum with CGFloat/String types -- auto-generated file had invalid Swift for non-Color constants (fontFamily, spacing as px strings)"
  - "Test target depends on WWDesignSystem + WWAnalytics only -- avoids HTTPTypes linker errors from transitive WWCore SPM dependencies in Tuist test scheme"

patterns-established:
  - "DI Protocol Pattern: feature packages depend on protocols in WWCore, never concrete types"
  - "Pre-generated OpenAPI: run swift-openapi-generator CLI, commit Generated/ output"
  - "Semantic Theme: WWTheme provides semantic color names mapped to design tokens"
  - "Dynamic Type Typography: all fonts use Font.custom with relativeTo: parameter"
  - "Age-Data Filter: PostHogAnalyticsService.filterProperties strips 7 forbidden keys case-insensitively"

requirements-completed: [IOS-01, IOS-02, IOS-03, IOS-14, IOS-15, IOS-16]

# Metrics
duration: 22min
completed: 2026-04-17
---

# Phase 5 Plan 01: iOS Core Foundation Summary

**Tuist-managed modular iOS project with 7 SPM packages, protocol-based DI, pre-generated OpenAPI client, design system with tokens/theme/components, Sentry+PostHog analytics with age-data filtering, and passing DesignTokenTests + AnalyticsTests**

## Performance

- **Duration:** 22 min
- **Started:** 2026-04-17T10:01:08Z
- **Completed:** 2026-04-17T10:23:22Z
- **Tasks:** 2
- **Files modified:** 52

## Accomplishments
- Replaced hand-crafted .xcodeproj with Tuist-managed project generating a buildable Xcode workspace
- Created 7 SPM local packages (WWCore, WWDesignSystem, WWAnalytics, WWOnboarding, WWTripWizard, WWPlanView, WWOffline) with correct dependency rules and no feature-to-feature deps
- Built complete DI protocol system and DependencyContainer for cross-cutting concerns
- Pre-generated type-safe OpenAPI client from openapi.v1.snapshot.json
- Created full design system: tokens, semantic theme, Dynamic Type typography, 4 reusable components (WWButton, WWCard, WWProgressBar, WWBlurOverlay)
- Integrated Sentry crash reporting and PostHog analytics with COPPA-compliant age-data filtering
- All 22 unit tests passing (11 DesignTokenTests + 11 AnalyticsTests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Tuist project + SPM package scaffolds + DI protocols + test target** - `5b18b59` (feat)
2. **Task 2: WWCore networking + auth + design system + analytics + tests** - `df9b5bd` (feat)

## Files Created/Modified
- `apps/ios/Project.swift` - Tuist project definition with all targets and package deps
- `apps/ios/Tuist/Package.swift` - External SPM dependency manifest
- `apps/ios/Packages/WWCore/Package.swift` - Core networking/auth/DI package
- `apps/ios/Packages/WWCore/Sources/WWCore/Protocols/*.swift` - 5 DI protocol files
- `apps/ios/Packages/WWCore/Sources/WWCore/DI/DependencyContainer.swift` - Protocol-based DI container
- `apps/ios/Packages/WWCore/Sources/WWCore/Generated/` - Pre-generated OpenAPI client and types
- `apps/ios/Packages/WWCore/Sources/WWCore/Networking/` - APIClient, AuthMiddleware, EnvelopeUnwrap
- `apps/ios/Packages/WWCore/Sources/WWCore/Auth/` - AuthService, KeychainStore
- `apps/ios/Packages/WWDesignSystem/` - Design tokens, theme, typography, 4 UI components
- `apps/ios/Packages/WWAnalytics/` - CrashReporting (Sentry) + AnalyticsService (PostHog)
- `apps/ios/Packages/WW{Onboarding,TripWizard,PlanView,Offline}/` - Feature package scaffolds
- `apps/ios/WonderWaltz/Resources/Localizable.xcstrings` - String Catalog for i18n
- `apps/ios/WonderWaltzTests/DesignTokenTests.swift` - Design token availability tests
- `apps/ios/WonderWaltzTests/AnalyticsTests.swift` - Age-data filtering tests

## Decisions Made
- Pre-generated OpenAPI client via CLI instead of Xcode build plugin (Tuist conflicts with plugin sandbox)
- sentry-cocoa pinned to exact 8.44.0 (newer versions broken with Swift 6.2 toolchain)
- AuthServiceProtocol marked @MainActor for @Observable compatibility
- WWDesignTokens rewritten as enum with proper Swift types (auto-generated had invalid syntax)
- Test target limited to WWDesignSystem + WWAnalytics deps to avoid HTTPTypes linker issues

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched from OpenAPI Generator build plugin to pre-generated client**
- **Found during:** Task 2
- **Issue:** Tuist-generated Xcode workspace fails plugin sandbox validation for Swift OpenAPI Generator build tool plugin
- **Fix:** Used swift-openapi-generator CLI to pre-generate Types.swift and Client.swift, committed as checked-in source in Generated/ directory
- **Files modified:** WWCore/Package.swift (removed plugin), Generated/Types.swift, Generated/Client.swift
- **Committed in:** df9b5bd

**2. [Rule 1 - Bug] Fixed sentry-cocoa version compatibility**
- **Found during:** Task 2
- **Issue:** sentry-cocoa latest version has Package@swift-6.1.swift with String(cString:encoding:) API that fails on Swift 6.2 toolchain
- **Fix:** Pinned to exact version 8.44.0 which resolves cleanly
- **Files modified:** Tuist/Package.swift, WWAnalytics/Package.swift
- **Committed in:** 5b18b59

**3. [Rule 1 - Bug] Fixed Sendable conformance for @MainActor AuthService**
- **Found during:** Task 2
- **Issue:** AuthServiceProtocol: Sendable conflicted with @MainActor isolation on AuthService class
- **Fix:** Marked AuthServiceProtocol as @MainActor instead of Sendable
- **Files modified:** AuthServiceProtocol.swift
- **Committed in:** df9b5bd

**4. [Rule 1 - Bug] Fixed WWDesignTokens invalid Swift syntax**
- **Found during:** Task 2
- **Issue:** Auto-generated WWDesignTokens.swift had non-Color fields as raw strings (e.g., `fontFamilyDisplay = Fraunces, serif`)
- **Fix:** Rewrote as enum with proper Swift types (String, CGFloat, Font.Weight)
- **Files modified:** WWDesignTokens.swift
- **Committed in:** df9b5bd

---

**Total deviations:** 4 auto-fixed (2 bugs, 1 blocking, 1 bug)
**Impact on plan:** All fixes necessary for compilation. Pre-generated OpenAPI is equivalent functionality to build plugin. No scope creep.

## Issues Encountered
- Sentry enableSwiftAsyncStacktraces property removed in 8.44.0 API; replaced with enableCaptureFailedRequests
- Test target linker errors with HTTPTypes transitive dependency from WWCore; resolved by limiting test target SPM deps

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 7 SPM packages compile cleanly
- WWCore protocols ready for feature package consumption
- WWDesignSystem tokens/theme/components available for onboarding and wizard UI
- WWAnalytics wired for crash reporting and event capture
- WonderWaltzTests target ready for additional test files in subsequent plans
- Next plan (05-02) can build onboarding flow on top of this foundation

---
*Phase: 05-ios-core*
*Completed: 2026-04-17*

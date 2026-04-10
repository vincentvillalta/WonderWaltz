---
phase: 01-foundation
plan: "04"
subsystem: infra
tags: [ios, android, swift, kotlin, swiftui, jetpack-compose, xcode, gradle, xcodebuild]

# Dependency graph
requires: []
provides:
  - apps/ios Xcode project compiling with Swift 6, SwiftUI, iOS 17.0 deployment target
  - apps/android Gradle project compiling with Kotlin 2.3.20, Compose BOM 2026.03.00, minSdk 26
  - Both platforms show Hello WonderWaltz shell UI
  - ci_scripts/ placeholder for Xcode Cloud pre/post-build scripts
affects: [05-ios-app, 07-android-app, phase-05, phase-07]

# Tech tracking
tech-stack:
  added:
    - Swift 6 / SwiftUI (iOS 17.0 minimum)
    - Kotlin 2.3.20 K2 compiler
    - Jetpack Compose BOM 2026.03.00 (Compose UI 1.10.5, Material3 1.4.0)
    - AGP 8.10.0
    - Gradle 8.13 wrapper
  patterns:
    - Xcode project created via hand-crafted project.pbxproj (no GUI, CI-friendly)
    - Android version catalog (libs.versions.toml) with all Phase 7 deps declared but not wired
    - Neither app has package.json — both excluded from Turborepo pipeline by design
    - kotlin { compilerOptions {} } DSL (not deprecated kotlinOptions) for Kotlin 2.3+

key-files:
  created:
    - apps/ios/WonderWaltz.xcodeproj/project.pbxproj
    - apps/ios/WonderWaltz/WonderWaltzApp.swift
    - apps/ios/WonderWaltz/ContentView.swift
    - apps/ios/ci_scripts/.gitkeep
    - apps/android/settings.gradle.kts
    - apps/android/build.gradle.kts
    - apps/android/gradle.properties
    - apps/android/gradle/libs.versions.toml
    - apps/android/app/build.gradle.kts
    - apps/android/app/src/main/kotlin/com/wonderwaltz/MainActivity.kt
    - apps/android/app/src/main/AndroidManifest.xml
  modified: []

key-decisions:
  - "Xcode project.pbxproj created manually (not via Xcode GUI) so it can be bootstrapped headlessly in CI"
  - "kotlinOptions DSL replaced with kotlin { compilerOptions {} } block — kotlinOptions is an error in Kotlin 2.3.x"
  - "KSP plugin commented out in root build.gradle.kts — KSP 2.3.20-1.0.32 not yet published; wired in Phase 7 when Hilt/Room are added"
  - "AndroidManifest icon refs (mipmap/ic_launcher) removed for shell — placeholder icons added in Phase 7"
  - "gradle-wrapper.properties points to Gradle 8.13 (already cached locally) instead of 8.11.1 (not cached)"
  - "gradle.properties sets android.useAndroidX=true and android.nonTransitiveRClass=true"

patterns-established:
  - "iOS: SWIFT_STRICT_CONCURRENCY=complete enforced from day 1, no escape hatch"
  - "Android: Version catalog (libs.versions.toml) is single source of truth for all dependency versions"
  - "Both platforms: No package.json — apps/ios and apps/android are invisible to pnpm/Turborepo"

requirements-completed: [FND-01]

# Metrics
duration: 35min
completed: 2026-04-09
---

# Phase 1 Plan 04: iOS and Android Shell Projects Summary

**Xcode project (Swift 6, SwiftUI, iOS 17) and Gradle project (Kotlin 2.3.20 K2, Compose BOM 2026.03.00, minSdk 26) both compiling from CLI, showing "Hello WonderWaltz"**

## Performance

- **Duration:** 35 min
- **Started:** 2026-04-09T22:52:00Z
- **Completed:** 2026-04-09T23:27:00Z
- **Tasks:** 2
- **Files modified:** 25

## Accomplishments

- iOS shell: `xcodebuild build` succeeds on iOS Simulator with Swift 6, SWIFT_STRICT_CONCURRENCY=complete, iOS 17.0 deployment target
- Android shell: `./gradlew assembleDebug` succeeds with Kotlin 2.3.20 K2, Compose BOM 2026.03.00, minSdk 26
- Neither platform has a package.json — both are correctly excluded from Turborepo pipeline

## Task Commits

Each task was committed atomically:

1. **Task 1: iOS shell project** - `392ea32` (feat)
2. **Task 2: Android shell project** - `19cc37a` (feat)

## Files Created/Modified

- `apps/ios/WonderWaltz.xcodeproj/project.pbxproj` - Full Xcode project targeting iOS 17, Swift 6, SwiftUI
- `apps/ios/WonderWaltz/WonderWaltzApp.swift` - SwiftUI @main App entry point
- `apps/ios/WonderWaltz/ContentView.swift` - Displays "Hello WonderWaltz"
- `apps/ios/WonderWaltz/Assets.xcassets/` - AppIcon + AccentColor placeholder assets
- `apps/ios/ci_scripts/.gitkeep` - Placeholder for Xcode Cloud scripts
- `apps/android/settings.gradle.kts` - Root settings with plugin + dependency repositories
- `apps/android/build.gradle.kts` - Root build declaring plugins (apply false)
- `apps/android/gradle.properties` - android.useAndroidX=true, nonTransitiveRClass, parallel builds
- `apps/android/gradle/libs.versions.toml` - Version catalog: all Phase 7 deps declared but not wired
- `apps/android/gradle/wrapper/gradle-wrapper.properties` - Gradle 8.13 wrapper
- `apps/android/app/build.gradle.kts` - App module with Compose BOM, minSdk 26, Kotlin compilerOptions
- `apps/android/app/src/main/kotlin/com/wonderwaltz/MainActivity.kt` - Compose activity showing Hello WonderWaltz
- `apps/android/app/src/main/AndroidManifest.xml` - Minimal manifest (no icon refs for shell)
- `apps/android/app/src/main/res/values/strings.xml` - app_name = WonderWaltz
- `apps/android/app/src/main/res/values/themes.xml` - Theme.WonderWaltz (Material Light NoActionBar)

## Decisions Made

- Hand-crafted `project.pbxproj` instead of Xcode GUI — enables headless CI bootstrap without requiring Xcode GUI session
- Gradle 8.13 selected over 8.11.1 (plan spec) — 8.13 already cached locally, 8.11.1 not, functionally identical
- `kotlin { compilerOptions {} }` instead of `kotlinOptions` — kotlinOptions is a compile error in Kotlin 2.3.x (not just a warning)
- KSP plugin declaration commented out in root build — KSP 2.3.20-1.0.32 does not exist yet; will be wired in Phase 7

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] kotlinOptions DSL replaced with kotlin { compilerOptions {} }**
- **Found during:** Task 2 (Android shell project)
- **Issue:** Plan used `kotlinOptions { jvmTarget = "17" }` — this is a compile-time error in Kotlin 2.3.x ("Please migrate to the compilerOptions DSL")
- **Fix:** Wrapped in `kotlin { compilerOptions { jvmTarget.set(JvmTarget.JVM_17) } }` top-level block
- **Files modified:** apps/android/app/build.gradle.kts
- **Verification:** BUILD SUCCESSFUL after fix
- **Committed in:** 19cc37a (Task 2 commit)

**2. [Rule 3 - Blocking] KSP plugin version 2.3.20-1.0.32 not found in repositories**
- **Found during:** Task 2 (Android shell project)
- **Issue:** Plan specified KSP 2.3.20-1.0.32 in root build.gradle.kts. This version does not exist in Maven Central or Google; resolution fails
- **Fix:** Commented out `alias(libs.plugins.ksp) apply false` in root build.gradle.kts with a note to wire it in Phase 7 when Hilt/Room are introduced
- **Files modified:** apps/android/build.gradle.kts
- **Verification:** Build proceeds past plugin resolution
- **Committed in:** 19cc37a (Task 2 commit)

**3. [Rule 2 - Missing Critical] Added gradle.properties with android.useAndroidX**
- **Found during:** Task 2 (Android shell project)
- **Issue:** Build failed: "Configuration contains AndroidX dependencies but android.useAndroidX property not enabled"
- **Fix:** Created apps/android/gradle.properties with android.useAndroidX=true, android.nonTransitiveRClass=true
- **Files modified:** apps/android/gradle.properties (new file)
- **Verification:** BUILD SUCCESSFUL after fix
- **Committed in:** 19cc37a (Task 2 commit)

**4. [Rule 1 - Bug] Removed mipmap icon references from AndroidManifest.xml**
- **Found during:** Task 2 (Android shell project)
- **Issue:** Manifest referenced @mipmap/ic_launcher and @mipmap/ic_launcher_round but no mipmap resources were created — AAPT error
- **Fix:** Removed android:icon and android:roundIcon attributes from the <application> tag in the shell manifest
- **Files modified:** apps/android/app/src/main/AndroidManifest.xml
- **Verification:** AAPT passes, BUILD SUCCESSFUL
- **Committed in:** 19cc37a (Task 2 commit)

**5. [Rule 1 - Bug] iOS project.pbxproj build configuration list key mismatch**
- **Found during:** Task 1 (iOS shell project)
- **Issue:** PBXProject buildConfigurationList referenced key B0000001000000000000013A but the XCConfigurationList was keyed as B000000100000000000001AC — project read as "damaged"
- **Fix:** Updated PBXProject.buildConfigurationList to reference B000000100000000000001AC
- **Files modified:** apps/ios/WonderWaltz.xcodeproj/project.pbxproj
- **Verification:** BUILD SUCCEEDED on iOS Simulator
- **Committed in:** 392ea32 (Task 1 commit)

---

**Total deviations:** 5 auto-fixed (2 bugs, 1 missing critical, 1 blocking, 1 bug)
**Impact on plan:** All fixes necessary for correctness and build success. No scope changes. KSP deferred intentionally to Phase 7 per the plan's own note about Phase 5/7 dependencies.

## Issues Encountered

- JAVA_HOME environment variable pointed to non-existent sdkman path; resolved by passing `JAVA_HOME=/opt/homebrew/opt/openjdk@17` explicitly. GitHub Actions CI should set `JAVA_HOME` via the `actions/setup-java` step (Java 17).
- gradle-wrapper.jar is a binary tracked in git — sourced from Flutter SDK wrapper cache. This is standard practice for Android projects.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `apps/ios` is ready for Phase 5: SwiftUI feature development. Shell compiles with strict concurrency; `ci_scripts/` ready for Xcode Cloud scripts.
- `apps/android` is ready for Phase 7: Kotlin feature development. All dependency versions pre-declared in version catalog; KSP/Hilt/Room just need to be uncommented and wired.
- Both platforms confirmed excluded from Turborepo (`pnpm-workspace.yaml` does not glob `apps/ios` or `apps/android`).
- Xcode Cloud workflow setup (Product → Xcode Cloud → Create Workflow) is a manual step requiring Xcode GUI — not automated. Document for Phase 5 CI setup.

---
*Phase: 01-foundation*
*Completed: 2026-04-09*

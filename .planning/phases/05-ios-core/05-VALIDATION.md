---
phase: 5
slug: ios-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | XCTest + Swift Testing (iOS 17+) |
| **Config file** | None — Xcode manages test targets |
| **Quick run command** | `xcodebuild build -scheme WonderWaltz -destination 'platform=iOS Simulator,name=iPhone 16'` |
| **Full suite command** | `xcodebuild test -scheme WonderWaltz -destination 'platform=iOS Simulator,name=iPhone 16'` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `xcodebuild build -scheme WonderWaltz -destination 'platform=iOS Simulator,name=iPhone 16'`
- **After every plan wave:** Run full test suite
- **Before `/gsd:verify-work`:** Full suite must be green + real-device smoke test
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 0 | IOS-01 | build | `xcodebuild build -scheme WonderWaltz -destination 'platform=iOS Simulator,name=iPhone 16'` | N/A (build gate) | ⬜ pending |
| TBD | 01 | 0 | IOS-02 | build | Build gate — generation failure = build failure | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | IOS-03 | unit | `xcodebuild test -only-testing WonderWaltzTests/DesignTokenTests` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | IOS-04 | unit | `xcodebuild test -only-testing WonderWaltzTests/OfflineTests` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | IOS-05 | unit | `xcodebuild test -only-testing WonderWaltzTests/OnboardingTests` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | IOS-06 | unit | `xcodebuild test -only-testing WonderWaltzTests/WizardTests` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | IOS-07 | unit | `xcodebuild test -only-testing WonderWaltzTests/PlanViewTests` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | IOS-14 | manual-only | Sentry SDK init verified in dashboard | N/A | ⬜ pending |
| TBD | 01 | 0 | IOS-15 | unit | `xcodebuild test -only-testing WonderWaltzTests/AnalyticsTests` | ❌ W0 | ⬜ pending |
| TBD | 01 | 0 | IOS-16 | build | Xcode warns on missing localizations | N/A (build gate) | ⬜ pending |
| TBD | 01 | 0 | IOS-17 | manual-only | Xcode Accessibility Inspector | N/A | ⬜ pending |
| TBD | 01 | 0 | IOS-18 | unit | `xcodebuild test -only-testing WonderWaltzTests/OfflineSyncTests` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `WonderWaltzTests/` test target — needs creation in Xcode project
- [ ] `WonderWaltzTests/DesignTokenTests.swift` — covers IOS-03
- [ ] `WonderWaltzTests/OfflineTests.swift` — covers IOS-04
- [ ] `WonderWaltzTests/OnboardingTests.swift` — covers IOS-05
- [ ] `WonderWaltzTests/WizardTests.swift` — covers IOS-06
- [ ] `WonderWaltzTests/PlanViewTests.swift` — covers IOS-07
- [ ] `WonderWaltzTests/AnalyticsTests.swift` — covers IOS-15
- [ ] `WonderWaltzTests/OfflineSyncTests.swift` — covers IOS-18
- [ ] Font files (Fraunces + Inter) bundled into Resources/

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sentry initialized without crash | IOS-14 | SDK init verification requires dashboard | Verify Sentry event appears in dashboard after first app launch |
| VoiceOver navigation + Dynamic Type | IOS-17 | Requires simulator/device interaction | Run Accessibility Inspector on every screen; test Dynamic Type at accessibility5 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

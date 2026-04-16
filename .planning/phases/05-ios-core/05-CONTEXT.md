# Phase 5: iOS Core - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

A working iOS app on a real iPhone: onboarding, trip wizard (dates through review), plan view with real backend data, offline sync for full trip packages, and WCAG 2.2 AA accessibility — all before the paywall is connected.

Requirements in scope: IOS-01, IOS-02, IOS-03, IOS-04, IOS-05, IOS-06, IOS-07, IOS-14, IOS-15, IOS-16, IOS-17, IOS-18 (12 requirement IDs).

Not in this phase: paywall/StoreKit (Phase 6), push notifications (Phase 6), countdown widget (Phase 6), Live Activity (Phase 9), Android (Phase 7).

</domain>

<decisions>
## Implementation Decisions

### Trip wizard flow & steps
- **Full-screen step cards** — each step is a full-screen view with progress bar at top. One question per screen. All visual/layout decisions follow the **Figma Make designs** (file key `9FLYsReiTPAfLoKAjW3Ahz`)
- **Step order follows IOS-06 exactly:** dates → parks+hopper → guests (DAS, mobility, sensory, diet) → budget tier → lodging+transport → must-do rides → meal preferences → review
- **Auto-save each step** — each completed step persisted locally via SwiftData. User can close the app and resume where they left off. No explicit "save" button needed
- **Ride picker and all other wizard UI elements follow Figma designs** — implementation should reference the Figma Make file for all visual/layout/interaction decisions

### Plan view & day timeline
- **All layout/navigation decisions follow Figma designs** — day navigation, item cards, timeline density, etc. are defined in Figma Make
- **Rethink-my-day loading:** inline loading with current plan visible. Plan stays visible but slightly dimmed. Floating progress indicator says "Rethinking your day...". Items animate to new positions when done
- **Locked days (free tier, Days 2+):** blurred cards with centered "Unlock Trip $9.99" CTA overlaying the blurred content. User can see they have a multi-day plan but can't read details
- **Walking times shown inline** between items in the timeline AND in item detail view, per Figma
- **Forecast confidence:** separate info section/banner at top of plan view explaining "Wait time forecasts are in beta" — NOT per-item badges. One-time framing rather than per-item noise (satisfies FC-05)

### Onboarding & first-run experience
- **Onboarding screens follow Figma designs** — number of screens, content, skip behavior all from Figma Make
- **Notification permission requested after plan generation** — after the user sees their Day 1 plan for the first time. Context: "Want reminders for Lightning Lane booking windows?" Highest opt-in rate
- **Anonymous session creation is silent** — POST /v1/auth/anonymous fires during splash screen, in the background. No loading indicator. User doesn't know they have an account
- **Auth failure on first launch:** retry silently, let user browse. Queue the auth call for retry. Let user go through onboarding and start wizard. Show gentle banner ("No internet — connect to save your trip") only when they try to generate a plan

### Offline sync strategy
- **Auto-download after plan generation** — immediately after a plan is generated, start downloading the offline package (catalog subset, walking graph, static maps) in the background. Show a small "Downloaded for offline" badge on the plan when complete
- **SwiftData first** (Apple's native persistence for iOS 17+). If real-device testing reveals instability, fall back to GRDB. IOS-04 already accounts for this fallback
- **Offline status indicator:** subtle top banner only when the user tries an action that needs internet (rethink, generate new plan). No persistent offline badge. Plan view works identically online or offline
- **Stale data handling:** background refresh when online. When app opens with internet, silently check if plan's underlying data has changed. If significant changes detected, show gentle prompt: "Park hours updated — refresh your plan?" Never auto-refresh without asking

### Claude's Discretion
- Swift OpenAPI Generator configuration and build integration details (IOS-02)
- SwiftData model schema design (IOS-04)
- Navigation architecture (NavigationStack vs coordinator pattern)
- Sentry Cocoa + PostHog iOS SDK integration details (IOS-14, IOS-15)
- String Catalog (.xcstrings) setup for i18n readiness (IOS-16)
- VoiceOver label strategy and Dynamic Type implementation (IOS-17)
- Background download task implementation for offline package
- Network layer architecture (async/await, error handling, retry logic)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`packages/design-tokens/generated/WWDesignTokens.swift`**: Full Swift color constants (navy, gold, cream, park colors, primitives, semantics) — ready to import into the Xcode project
- **`packages/shared-openapi/openapi.v1.snapshot.json`**: Frozen OpenAPI spec with all Phase 4 endpoints — Swift OpenAPI Generator will generate the networking client from this
- **`docs/design/BRAND.md`**: Brand direction, voice, palette, typography — reference for all UI decisions
- **`docs/design/COMPONENTS.md`**: Component catalog with states (loading, empty, error, success, disabled)
- **`docs/design/ACCESSIBILITY.md`**: WCAG 2.2 AA rules (contrast, tap targets, focus, Dynamic Type, VoiceOver)
- **`docs/design/ICONOGRAPHY.md`**: Phosphor Icons (MIT, cross-platform)
- **Figma Make file** (`9FLYsReiTPAfLoKAjW3Ahz`): Canonical source for all screen designs, component specs, interaction patterns

### Established Patterns
- **Xcode Cloud for iOS CI** — build on every PR, no GitHub Actions macOS runner (Phase 1 decision)
- **NestJS response envelope** `{ data, meta: { disclaimer } }` — iOS networking layer must unwrap this
- **Anonymous-first auth** — app creates anonymous session silently, all API calls use JWT bearer token
- **One trip per anonymous user** — enforced server-side but client should also prevent creating a second trip

### Integration Points
- **`apps/ios/WonderWaltz.xcodeproj`**: Shell project exists with `WonderWaltzApp.swift` and `ContentView.swift` placeholder — Phase 5 replaces the placeholder with the full app
- **Backend endpoints (Phase 4):** `POST /v1/auth/anonymous`, `POST /trips`, `POST /trips/:id/generate-plan`, `GET /plans/:id`, `POST /trips/:id/rethink-today`, `GET /v1/users/me`
- **Supabase Auth**: JWT tokens from backend, stored in iOS Keychain
- **Design tokens**: `WWDesignTokens.swift` imported as a source file into the Xcode project

</code_context>

<specifics>
## Specific Ideas

- **Figma Make is the canonical design source** — all visual, layout, and interaction decisions that are covered in the Figma file should be implemented faithfully. CONTEXT.md decisions cover behavioral/architectural choices that Figma doesn't address
- The first-timer persona drives everything: the trip wizard should feel guided and reassuring, not like a complex form. "Like a Disney expert is walking you through it"
- Park hours changes should never silently alter the user's plan — always prompt before refreshing

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-ios-core*
*Context gathered: 2026-04-16*

# Phase 5: iOS Core - Research

**Researched:** 2026-04-16
**Domain:** iOS native app development (SwiftUI, Swift 6, Swift Concurrency, Observation framework)
**Confidence:** HIGH

## Summary

Phase 5 transforms a shell Xcode project into a fully functional iOS app covering onboarding, trip wizard, plan view with real backend data, offline caching, and WCAG 2.2 AA accessibility. The existing project at `apps/ios/` already targets iOS 17.0, Swift 6.0 with `SWIFT_STRICT_CONCURRENCY = complete`, and has placeholder `WonderWaltzApp.swift` and `ContentView.swift` files. The design tokens (`WWDesignTokens.swift`) and the frozen OpenAPI v1 snapshot are ready for consumption.

The architecture uses Swift OpenAPI Generator 1.11.1 for type-safe networking from the OpenAPI spec, SwiftData for persistence (with GRDB as a documented fallback), the `@Observable` macro with the Observation framework for state management, and `NavigationStack` for navigation. Sentry Cocoa and PostHog iOS SDK handle crash reporting and analytics respectively. Xcode Cloud handles CI (no GitHub Actions macOS runner).

**Primary recommendation:** Structure the app into clear modules (WWCore for networking/auth, WWDesignSystem for tokens/components, WWOffline for persistence/sync) with `@Observable` view models, NavigationStack-based routing, and a SwiftData-first persistence layer. Use the Swift OpenAPI Generator build plugin to generate the API client at build time from the frozen OpenAPI snapshot.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Trip wizard flow:** Full-screen step cards with progress bar, one question per screen. Step order: dates -> parks+hopper -> guests (DAS, mobility, sensory, diet) -> budget tier -> lodging+transport -> must-do rides -> meal preferences -> review. Auto-save each step via SwiftData
- **Plan view:** Day navigation, item cards, timeline per Figma. Rethink-my-day: inline loading with current plan visible, dimmed, floating "Rethinking your day..." indicator, items animate to new positions. Locked days (free tier Days 2+): blurred cards with "Unlock Trip $9.99" CTA. Walking times inline. Forecast confidence: single info banner at top of plan view
- **Onboarding:** Follow Figma designs. Notification permission after plan generation ("Want reminders for Lightning Lane booking windows?"). Anonymous session creation silent during splash screen. Auth failure: retry silently, let user browse, show gentle banner only when generating plan
- **Offline sync:** Auto-download after plan generation (catalog subset, walking graph, static maps). SwiftData first (fallback to GRDB if unstable on real devices). Subtle top banner only when user tries action needing internet. Background refresh with user prompt for significant changes
- **Figma Make is canonical design source** (file key `9FLYsReiTPAfLoKAjW3Ahz`) for all visual, layout, and interaction decisions

### Claude's Discretion
- Swift OpenAPI Generator configuration and build integration details (IOS-02)
- SwiftData model schema design (IOS-04)
- Navigation architecture (NavigationStack vs coordinator pattern)
- Sentry Cocoa + PostHog iOS SDK integration details (IOS-14, IOS-15)
- String Catalog (.xcstrings) setup for i18n readiness (IOS-16)
- VoiceOver label strategy and Dynamic Type implementation (IOS-17)
- Background download task implementation for offline package
- Network layer architecture (async/await, error handling, retry logic)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| IOS-01 | Xcode project targets iOS 17.0 min, Swift 6, SwiftUI, Swift Concurrency, Observation framework | Existing pbxproj already configured: iOS 17.0, Swift 6.0, SWIFT_STRICT_CONCURRENCY=complete. Add SPM dependencies + @Observable pattern |
| IOS-02 | WWCore module with Swift OpenAPI Generator 1.11.1 client from openapi.v1.snapshot.json at build time | Swift OpenAPI Generator build plugin + URLSessionTransport + openapi-generator-config.yaml. See Architecture Patterns |
| IOS-03 | WWDesignSystem module consuming design-tokens generated Swift constants | WWDesignTokens.swift already generated. Import as source file, wrap in theme/component helpers |
| IOS-04 | WWOffline module with SwiftData persistence + background sync coordinator (GRDB fallback) | SwiftData ModelContainer + ModelActor for background ops. See Don't Hand-Roll and Pitfalls sections |
| IOS-05 | Onboarding flow with contextual notification permission | Figma-driven screens, permission request after first plan generation via UNUserNotificationCenter |
| IOS-06 | Trip wizard: dates -> parks+hopper -> guests -> budget -> lodging+transport -> must-do -> meals -> review | Full-screen step cards, NavigationStack, SwiftData auto-save per step |
| IOS-07 | Plan view: day tabs -> timeline -> item cards -> detail -> rethink button | ScrollView timeline, day tab picker, inline rethink loading, blur overlay for locked days |
| IOS-14 | Sentry Cocoa 9.8.0 SDK with release health | SPM integration, SentrySDK.start in app init, dSYM upload via Xcode Cloud |
| IOS-15 | PostHog iOS SDK with event schema excluding guest age data | SPM integration, PostHogConfig setup, explicit property filtering |
| IOS-16 | All strings via String Catalogs (.xcstrings) for future i18n | Add Localizable.xcstrings, use LocalizedStringKey in all views, Xcode auto-discovers strings |
| IOS-17 | Dynamic Type up to accessibility5, VoiceOver labels, reduce motion, reduce transparency | .font(.body) semantic fonts, accessibilityLabel on all interactive elements, @Environment checks |
| IOS-18 | Offline: trip+plan+catalog+walking graph+static maps persisted, full read-only with no signal | SwiftData for structured data, FileManager for maps/assets, background URLSession download task |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SwiftUI | iOS 17+ | UI framework | Apple's declarative UI, required by project spec |
| Observation framework | iOS 17+ | State management via @Observable | Replaces ObservableObject, granular view updates, Swift 6 concurrency-safe |
| Swift OpenAPI Generator | 1.11.1 | API client code generation from OpenAPI spec | Apple's official tool, type-safe, build-time generation, no manual networking code |
| OpenAPIURLSession | latest | HTTP transport for generated client | URLSession-based transport, standard Apple networking |
| SwiftData | iOS 17+ | Local persistence (primary) | Apple's modern persistence, SwiftUI integration via @Query |
| Sentry Cocoa | 9.8.0 | Crash reporting + release health | Industry standard, required by IOS-14 |
| PostHog iOS | latest | Analytics + event tracking | Required by IOS-15, project standard |
| PhosphorSwift | latest | Icon library | Project decision DSGN-07, MIT license, cross-platform parity |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| GRDB.swift | latest | SQLite persistence (fallback) | Only if SwiftData proves unstable on real iOS 17/18 devices |
| KeychainAccess | latest | Keychain wrapper for JWT storage | Simpler API than raw Security framework for token storage |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SwiftData | GRDB.swift | GRDB is more stable/performant but lacks @Query SwiftUI integration; SwiftData is project decision with GRDB fallback |
| NavigationStack | Coordinator pattern | Coordinators add indirection; NavigationStack with NavigationPath is sufficient for this app's depth |
| KeychainAccess | Raw Security framework | Raw API is verbose and error-prone; KeychainAccess wraps it cleanly |

**Installation (via Xcode SPM):**
```
// Package dependencies in Xcode project:
https://github.com/apple/swift-openapi-generator (1.11.1)
https://github.com/apple/swift-openapi-runtime (latest compatible)
https://github.com/apple/swift-openapi-urlsession (latest compatible)
https://github.com/getsentry/sentry-cocoa (9.8.0)
https://github.com/PostHog/posthog-ios (latest)
https://github.com/phosphor-icons/swift (latest)
https://github.com/kishikawakatsumi/KeychainAccess (latest)
```

## Architecture Patterns

### Recommended Project Structure
```
apps/ios/WonderWaltz/
├── App/
│   ├── WonderWaltzApp.swift          # @main, app init, Sentry/PostHog setup
│   └── AppState.swift                # @Observable root state (auth, navigation)
├── Core/                             # WWCore module
│   ├── API/
│   │   ├── openapi.yaml              # Symlink/copy of openapi.v1.snapshot.json
│   │   ├── openapi-generator-config.yaml
│   │   ├── APIClient.swift           # Configured Client + URLSessionTransport
│   │   └── AuthMiddleware.swift      # ClientMiddleware injecting Bearer token
│   ├── Auth/
│   │   ├── AuthService.swift         # @Observable, anonymous auth, token mgmt
│   │   └── KeychainStore.swift       # JWT token persistence via Keychain
│   └── Networking/
│       ├── RetryMiddleware.swift      # Exponential backoff retry logic
│       └── EnvelopeUnwrap.swift       # Unwrap { data, meta } response envelope
├── DesignSystem/                     # WWDesignSystem module
│   ├── WWDesignTokens.swift          # Imported from packages/design-tokens/generated/
│   ├── Theme.swift                   # Semantic color/font helpers
│   ├── Components/                   # Reusable UI components
│   │   ├── WWButton.swift
│   │   ├── WWCard.swift
│   │   ├── WWProgressBar.swift
│   │   └── WWBlurOverlay.swift
│   └── Typography.swift              # Fraunces + Inter font loading, Dynamic Type
├── Features/
│   ├── Onboarding/
│   │   ├── OnboardingView.swift
│   │   └── OnboardingViewModel.swift # @Observable
│   ├── TripWizard/
│   │   ├── WizardContainerView.swift # NavigationStack + progress bar
│   │   ├── Steps/                    # One view per wizard step
│   │   │   ├── DatesStepView.swift
│   │   │   ├── ParksStepView.swift
│   │   │   ├── GuestsStepView.swift
│   │   │   ├── BudgetStepView.swift
│   │   │   ├── LodgingStepView.swift
│   │   │   ├── MustDoRidesStepView.swift
│   │   │   ├── MealPrefsStepView.swift
│   │   │   └── ReviewStepView.swift
│   │   └── WizardViewModel.swift     # @Observable, auto-save per step
│   ├── PlanView/
│   │   ├── PlanContainerView.swift   # Day tabs + timeline
│   │   ├── DayTimelineView.swift     # Scrollable item timeline
│   │   ├── PlanItemCard.swift        # Polymorphic card (ride, meal, show, etc.)
│   │   ├── PlanItemDetailView.swift
│   │   ├── RethinkLoadingView.swift  # Inline rethink overlay
│   │   ├── LockedDayOverlay.swift    # Blur + "Unlock Trip" CTA
│   │   └── PlanViewModel.swift       # @Observable
│   └── Splash/
│       └── SplashView.swift          # Silent anonymous auth
├── Offline/                          # WWOffline module
│   ├── Models/                       # SwiftData @Model classes
│   │   ├── CachedTrip.swift
│   │   ├── CachedPlan.swift
│   │   ├── CachedPlanDay.swift
│   │   ├── CachedPlanItem.swift
│   │   ├── CachedAttraction.swift
│   │   ├── CachedWalkingEdge.swift
│   │   └── WizardDraft.swift         # Auto-saved wizard state
│   ├── SyncCoordinator.swift         # Background sync orchestration
│   ├── OfflinePackageDownloader.swift # Background URLSession for offline package
│   └── ModelContainer+Config.swift   # SwiftData container configuration
├── Analytics/
│   ├── AnalyticsService.swift        # PostHog wrapper, age-data filtering
│   └── CrashReporting.swift          # Sentry configuration
├── Resources/
│   ├── Localizable.xcstrings         # String Catalog
│   ├── Fonts/                        # Fraunces + Inter variable fonts
│   └── Assets.xcassets
└── Utilities/
    ├── Environment+Extensions.swift  # @Environment helpers for reduce motion etc.
    └── AccessibilityHelpers.swift    # VoiceOver utility extensions
```

### Pattern 1: @Observable ViewModel Pattern
**What:** Use the Observation framework's @Observable macro for all view models instead of ObservableObject
**When to use:** Every view that needs mutable state beyond simple @State
**Example:**
```swift
// Source: Apple Observation framework docs
@Observable
final class WizardViewModel {
    var currentStep: WizardStep = .dates
    var draft: WizardDraft
    var isSubmitting = false

    private let apiClient: Client
    private let modelContext: ModelContext

    init(apiClient: Client, modelContext: ModelContext) {
        self.apiClient = apiClient
        self.modelContext = modelContext
        // Load or create draft from SwiftData
        self.draft = Self.loadOrCreateDraft(modelContext: modelContext)
    }

    func advanceStep() {
        // Auto-save current step to SwiftData
        try? modelContext.save()
        currentStep = currentStep.next
    }
}

// In SwiftUI view:
struct WizardContainerView: View {
    @State private var viewModel: WizardViewModel

    var body: some View {
        NavigationStack {
            // Step content based on viewModel.currentStep
        }
    }
}
```

### Pattern 2: Swift OpenAPI Generator Client Setup
**What:** Generate type-safe API client from OpenAPI spec at build time
**When to use:** All backend API calls
**Example:**
```swift
// openapi-generator-config.yaml (placed in Core/API/):
generate:
  - types
  - client

// APIClient.swift:
import OpenAPIRuntime
import OpenAPIURLSession

actor APIClientProvider {
    static let shared = APIClientProvider()

    func makeClient(authToken: String?) -> Client {
        let transport = URLSessionTransport()
        var middlewares: [any ClientMiddleware] = []
        if let token = authToken {
            middlewares.append(AuthMiddleware(token: token))
        }
        return Client(
            serverURL: URL(string: "https://api.wonderwaltz.com")!,
            transport: transport,
            middlewares: middlewares
        )
    }
}

// AuthMiddleware.swift:
struct AuthMiddleware: ClientMiddleware {
    let token: String

    func intercept(
        _ request: HTTPRequest,
        body: HTTPBody?,
        baseURL: URL,
        operationID: String,
        next: @Sendable (HTTPRequest, HTTPBody?, URL) async throws -> (HTTPResponse, HTTPBody?)
    ) async throws -> (HTTPResponse, HTTPBody?) {
        var request = request
        request.headerFields[.authorization] = "Bearer \(token)"
        return try await next(request, body, baseURL)
    }
}
```

### Pattern 3: SwiftData Background Sync with ModelActor
**What:** Perform database writes on a background actor to avoid blocking the main thread
**When to use:** Offline package download/storage, plan caching, bulk data operations
**Example:**
```swift
// Source: Apple SwiftData + ModelActor docs
@ModelActor
actor BackgroundSyncActor {
    func cachePlan(_ planResponse: PlanResponse) throws {
        let cachedPlan = CachedPlan(from: planResponse)
        modelContext.insert(cachedPlan)
        for day in planResponse.days {
            let cachedDay = CachedPlanDay(from: day, plan: cachedPlan)
            modelContext.insert(cachedDay)
        }
        try modelContext.save()
    }
}

// Usage from view model:
let syncActor = BackgroundSyncActor(modelContainer: container)
try await syncActor.cachePlan(planResponse)
```

### Pattern 4: Response Envelope Unwrapping
**What:** The NestJS backend wraps all responses in `{ data, meta: { disclaimer } }`. The generated OpenAPI client types include this envelope, but views should work with unwrapped data.
**When to use:** Every API response consumption
**Example:**
```swift
// The generated types from OpenAPI will include the envelope structure.
// Create extension helpers to unwrap:
extension Client {
    func getTrip(id: String) async throws -> TripResponse {
        let response = try await getTrip(path: .init(id: id))
        switch response {
        case .ok(let ok):
            return try ok.body.json.data
        case .unauthorized:
            throw APIError.unauthorized
        default:
            throw APIError.unexpected
        }
    }
}
```

### Anti-Patterns to Avoid
- **ObservableObject + @Published:** Use @Observable instead. ObservableObject causes full-view re-renders on any @Published change; @Observable provides granular property tracking
- **Storing tokens in UserDefaults:** Always use Keychain for JWT tokens. UserDefaults is plaintext on jailbroken devices
- **ModelContext on wrong actor:** SwiftData ModelContext is NOT sendable. Always create background contexts via ModelActor, pass PersistentIdentifier between actors (not model objects)
- **Fixed font sizes:** Always use semantic `.font(.body)` / `.font(.title)` for Dynamic Type support. Never `.font(.system(size: 17))`
- **Blocking main thread with sync I/O:** All network calls and SwiftData writes in background via async/await and ModelActor

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API client code | Manual URLSession + Codable wrappers | Swift OpenAPI Generator from openapi.v1.snapshot.json | Type-safe, always in sync with spec, handles all edge cases |
| Token storage | UserDefaults or file-based storage | KeychainAccess wrapping iOS Keychain | Security requirement; Keychain survives app reinstall, encrypted at rest |
| Token refresh flow | Manual retry + token refresh interceptor | Actor-based auth service with in-flight dedup | Concurrent requests during refresh cause race conditions without actor serialization |
| Date/calendar pickers | Custom date picker UI | SwiftUI DatePicker with custom styling | Locale handling, accessibility, VoiceOver all built in |
| Pull-to-refresh | Custom scroll view gesture | .refreshable modifier | Native UIRefreshControl behavior, accessibility support |
| Image caching | NSCache-based image loader | AsyncImage or SwiftUI built-in caching | For static map tiles, built-in is sufficient; no user photos in this phase |
| Blur effect | Custom blur filter | .blur() modifier + Material | System vibrancy, Dynamic Type safe, reduce transparency respects |
| String localization | NSLocalizedString manual calls | String Catalogs (.xcstrings) + LocalizedStringKey | Xcode auto-discovers strings, handles plurals, device variations |

**Key insight:** iOS 17+ provides high-quality system components for nearly everything in this app. Custom UI should be limited to the brand-specific design system components (themed cards, wizard step containers, timeline views). Navigation, forms, lists, and accessibility primitives should all use system components.

## Common Pitfalls

### Pitfall 1: SwiftData Memory Explosion on iOS 18
**What goes wrong:** Calling `.count` on array relationships or @Query loads entire arrays into memory. Properties with `.externalStorage` load unnecessarily.
**Why it happens:** SwiftData eager-loads relationship data in iOS 18 differently than iOS 17.
**How to avoid:** Use lightweight fetch descriptors with `#Predicate` and `fetchLimit`. Avoid `.count` on relationships; use a separate `FetchDescriptor` with `.fetchCount`. Test memory with Instruments on real iOS 18 device.
**Warning signs:** Memory spikes when scrolling plan view with many cached items.

### Pitfall 2: Swift OpenAPI Generator Config Files Not Found
**What goes wrong:** Build fails with "could not find openapi-generator-config.yaml" error.
**Why it happens:** The config files must be added to the target's "Compile Sources" build phase in Xcode, not just exist in the directory.
**How to avoid:** After adding `openapi.yaml` (renamed from JSON) and `openapi-generator-config.yaml` to the project, ensure both appear in Build Phases > Compile Sources. Add the OpenAPIGenerator build tool plugin in Build Phases > Run Build Tool Plug-ins.
**Warning signs:** Clean build fails, but cached build works.

### Pitfall 3: Swift 6 Strict Concurrency Violations
**What goes wrong:** Compiler errors about non-sendable types crossing actor boundaries, especially with SwiftData models and view models.
**Why it happens:** The project has `SWIFT_STRICT_CONCURRENCY = complete` already set. SwiftData `@Model` objects are NOT Sendable.
**How to avoid:** Pass `PersistentIdentifier` (not model objects) between actors. Use `@MainActor` for view models that touch UI state. Use `@ModelActor` for background work. Mark closures as `@Sendable` explicitly.
**Warning signs:** Build errors mentioning "Sendable" or "actor-isolated" on seemingly simple code.

### Pitfall 4: @Observable + @Environment Interaction
**What goes wrong:** Views don't update when @Observable properties change, or update too frequently.
**Why it happens:** Misunderstanding @Observable tracking. Accessing properties in closures (not directly in body) breaks observation tracking.
**How to avoid:** Access @Observable properties directly in the view body, not via computed properties that capture self. Use @State for view-owned @Observable objects.
**Warning signs:** Stale data in views after mutations, or view body being called excessively.

### Pitfall 5: Notification Permission Timing
**What goes wrong:** Low notification opt-in rate.
**Why it happens:** Requesting permission too early (before user sees value) or without context.
**How to avoid:** Per CONTEXT.md decision: request after plan generation, with context "Want reminders for Lightning Lane booking windows?" Use `UNUserNotificationCenter.requestAuthorization` only at that moment.
**Warning signs:** System prompt appears before user has seen their plan.

### Pitfall 6: OpenAPI JSON vs YAML Format
**What goes wrong:** Swift OpenAPI Generator expects YAML or JSON file named `openapi.yaml` or `openapi.json` in the target.
**Why it happens:** The project has `openapi.v1.snapshot.json` -- this is JSON format, which the generator supports, but the file needs to be named correctly and placed in the target.
**How to avoid:** Copy or symlink the snapshot as `openapi.json` into the Core/API/ directory. Ensure it's in the Compile Sources build phase.
**Warning signs:** Generator outputs empty or errors about unrecognized format.

### Pitfall 7: Fraunces/Inter Fonts Not Scaling with Dynamic Type
**What goes wrong:** Custom fonts don't respond to Dynamic Type accessibility settings.
**Why it happens:** Using `Font.custom("Fraunces", size: 28)` bypasses Dynamic Type scaling.
**How to avoid:** Use `Font.custom("Fraunces", size: 28, relativeTo: .title)` which scales the custom font relative to the Dynamic Type text style. Always specify `relativeTo:` parameter.
**Warning signs:** Text stays same size when changing system text size in accessibility settings.

## Code Examples

### Anonymous Auth Flow on App Launch
```swift
// Source: Project pattern - silent anonymous auth during splash
@Observable
final class AuthService {
    var token: String?
    var isAuthenticated: Bool { token != nil }
    private let keychain = KeychainStore()
    private let apiClient: Client

    func silentAuth() async {
        // Try loading cached token first
        if let cached = keychain.getToken() {
            self.token = cached
            return
        }
        // Create anonymous session
        do {
            let response = try await apiClient.anonymousAuth()
            // response envelope: { data: { access_token, user_id }, meta }
            let authData = try response.ok.body.json.data
            keychain.saveToken(authData.access_token)
            self.token = authData.access_token
        } catch {
            // Retry silently, user can browse without auth
            // Show gentle banner only when they try to generate plan
        }
    }
}
```

### Wizard Auto-Save with SwiftData
```swift
// Source: SwiftData @Model pattern
@Model
final class WizardDraft {
    var startDate: Date?
    var endDate: Date?
    var selectedParkIds: [String] = []
    var hasHopper: Bool = false
    var guests: [GuestDraft] = []
    var budgetTier: String?
    var lodgingType: String?
    var transportType: String?
    var mustDoRideIds: [String] = []
    var mealPreferences: [String] = []
    var currentStep: Int = 0
    var createdAt: Date = Date()

    init() {}
}

// In WizardViewModel:
func saveCurrentStep() {
    // SwiftData auto-tracks changes; just call save
    try? modelContext.save()
}
```

### Locked Day Blur Overlay
```swift
// Source: SwiftUI blur + overlay pattern
struct LockedDayOverlay: View {
    let onUnlockTap: () -> Void

    var body: some View {
        ZStack {
            // Content underneath is blurred
            Color.clear
                .background(.ultraThinMaterial)

            VStack(spacing: 16) {
                Image(systemName: "lock.fill")
                    .font(.largeTitle)
                    .foregroundStyle(WWDesignTokens.colorPrimitiveGold)

                Text("Unlock Trip")
                    .font(.custom("Fraunces", size: 22, relativeTo: .title2))
                    .foregroundStyle(WWDesignTokens.colorPrimitiveNavy)

                Button(action: onUnlockTap) {
                    Text("$9.99")
                        .font(.headline)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                }
                .buttonStyle(.borderedProminent)
                .tint(WWDesignTokens.colorPrimitiveGold)
                .accessibilityLabel("Unlock full trip for nine dollars and ninety-nine cents")
            }
        }
    }
}
```

### PostHog Event with Age Data Filtering
```swift
// Source: PostHog iOS SDK docs + project requirement IOS-15
final class AnalyticsService {
    private static let forbiddenProperties: Set<String> = [
        "guest_age", "age_bracket", "guest_age_bracket",
        "age", "dob", "birthdate", "birth_date"
    ]

    static func capture(_ event: String, properties: [String: Any] = [:]) {
        // Strip any guest age data before sending
        let filtered = properties.filter { key, _ in
            !forbiddenProperties.contains(key.lowercased())
        }
        PostHogSDK.shared.capture(event, properties: filtered)
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ObservableObject + @Published | @Observable macro (Observation framework) | iOS 17 / WWDC 2023 | Granular property tracking, no @Published boilerplate, better performance |
| Combine for async | Swift Concurrency (async/await, actors) | Swift 5.5+ / Swift 6 strict | First-class language support, compiler-checked data races |
| Core Data | SwiftData | iOS 17 / WWDC 2023 | Declarative @Model, @Query in SwiftUI, simpler schema |
| NavigationView | NavigationStack + NavigationPath | iOS 16+ | Programmatic navigation, type-safe, deep linking support |
| Localizable.strings | String Catalogs (.xcstrings) | Xcode 15 / 2023 | Auto-discovery, built-in plural handling, visual editor |
| SentrySwiftUI (separate module) | Merged into main Sentry module | Sentry Cocoa 9.x | SentrySwiftUI is deprecated; all SwiftUI APIs in main Sentry |
| Manual URLSession networking | Swift OpenAPI Generator | 1.0 released 2024 | Type-safe client from spec, no manual Codable/URLSession code |

**Deprecated/outdated:**
- `SentrySwiftUI` module: Deprecated. Use main `Sentry` module which now includes all SwiftUI APIs
- `ObservableObject` + `@Published`: Still works but @Observable is strictly better for new code
- `NavigationView`: Deprecated since iOS 16, use NavigationStack
- `.strings` / `.stringsdict` files: Superseded by String Catalogs (.xcstrings)

## Open Questions

1. **Rethink-my-day offline path**
   - What we know: CONTEXT.md specifies online-only for rethink (shows gentle banner when offline). The solver runs server-side.
   - What's unclear: Whether a future phase will need on-device solver. STATE.md flags this as open question for Phase 5.
   - Recommendation: Implement rethink as online-only per CONTEXT.md. Show "Connect to internet to rethink your day" banner. Do not embed solver. Revisit if user research shows strong offline-rethink demand.

2. **OpenAPI spec format handling**
   - What we know: The snapshot is JSON (`openapi.v1.snapshot.json`). Swift OpenAPI Generator supports both JSON and YAML.
   - What's unclear: Whether the build plugin auto-resolves JSON format or needs explicit naming.
   - Recommendation: Copy the snapshot as `openapi.json` into the API source directory. Add to Compile Sources build phase. Test with a clean build before wiring up all generated types.

3. **Custom fonts (Fraunces + Inter) bundling**
   - What we know: Web uses Google Fonts. iOS needs bundled font files.
   - What's unclear: Whether the font files are already in the monorepo or need to be downloaded separately.
   - Recommendation: Download Fraunces and Inter variable font files (.ttf or .otf), add to Resources/Fonts/, register in Info.plist UIAppFonts array. Use `Font.custom(_:size:relativeTo:)` for Dynamic Type scaling.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | XCTest + Swift Testing (iOS 17+) |
| Config file | None -- Xcode manages test targets |
| Quick run command | `xcodebuild test -scheme WonderWaltz -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing WonderWaltzTests` |
| Full suite command | `xcodebuild test -scheme WonderWaltz -destination 'platform=iOS Simulator,name=iPhone 16'` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IOS-01 | Project builds with iOS 17 target, Swift 6 | build | `xcodebuild build -scheme WonderWaltz -destination 'platform=iOS Simulator,name=iPhone 16'` | N/A (build gate) |
| IOS-02 | OpenAPI client generates and compiles | build | Build gate -- generation failure = build failure | N/A Wave 0 |
| IOS-03 | Design tokens imported and accessible | unit | `xcodebuild test -only-testing WonderWaltzTests/DesignTokenTests` | Wave 0 |
| IOS-04 | SwiftData models persist and load | unit | `xcodebuild test -only-testing WonderWaltzTests/OfflineTests` | Wave 0 |
| IOS-05 | Onboarding flow navigation | unit | `xcodebuild test -only-testing WonderWaltzTests/OnboardingTests` | Wave 0 |
| IOS-06 | Wizard step progression and auto-save | unit | `xcodebuild test -only-testing WonderWaltzTests/WizardTests` | Wave 0 |
| IOS-07 | Plan view renders items correctly | unit | `xcodebuild test -only-testing WonderWaltzTests/PlanViewTests` | Wave 0 |
| IOS-14 | Sentry initialized without crash | smoke | Build + manual verify Sentry event in dashboard | manual-only: SDK init verification |
| IOS-15 | PostHog captures events, no age data | unit | `xcodebuild test -only-testing WonderWaltzTests/AnalyticsTests` | Wave 0 |
| IOS-16 | Strings in String Catalog | build | Xcode warns on missing localizations | N/A (build gate) |
| IOS-17 | Dynamic Type + VoiceOver labels | manual-only | Xcode Accessibility Inspector | manual-only: requires simulator interaction |
| IOS-18 | Offline data persists across app relaunch | unit | `xcodebuild test -only-testing WonderWaltzTests/OfflineSyncTests` | Wave 0 |

### Sampling Rate
- **Per task commit:** `xcodebuild build -scheme WonderWaltz -destination 'platform=iOS Simulator,name=iPhone 16'`
- **Per wave merge:** Full test suite run
- **Phase gate:** Full suite green + real-device smoke test before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `WonderWaltzTests/` test target -- needs creation in Xcode project
- [ ] `WonderWaltzTests/DesignTokenTests.swift` -- covers IOS-03
- [ ] `WonderWaltzTests/OfflineTests.swift` -- covers IOS-04
- [ ] `WonderWaltzTests/WizardTests.swift` -- covers IOS-06
- [ ] `WonderWaltzTests/PlanViewTests.swift` -- covers IOS-07
- [ ] `WonderWaltzTests/AnalyticsTests.swift` -- covers IOS-15
- [ ] `WonderWaltzTests/OfflineSyncTests.swift` -- covers IOS-18
- [ ] Font files (Fraunces + Inter) need to be added to Resources/

## Sources

### Primary (HIGH confidence)
- Apple developer docs: SwiftData, Observation framework, NavigationStack, String Catalogs
- [Swift OpenAPI Generator 1.11.1 - Swift Package Index](https://swiftpackageindex.com/apple/swift-openapi-generator)
- [Sentry Cocoa SDK SPM installation](https://docs.sentry.io/platforms/apple/install/swift-package-manager/)
- [PostHog iOS SDK docs](https://posthog.com/docs/libraries/ios)
- [Phosphor Icons Swift](https://github.com/phosphor-icons/swift)
- Existing project: `apps/ios/WonderWaltz.xcodeproj/project.pbxproj` (verified iOS 17.0, Swift 6.0, strict concurrency)
- Existing project: `packages/design-tokens/generated/WWDesignTokens.swift` (verified SwiftUI Color constants)
- Existing project: `packages/shared-openapi/openapi.v1.snapshot.json` (15 endpoints verified)

### Secondary (MEDIUM confidence)
- [SwiftData best practices and pitfalls - Fatbobman](https://fatbobman.com/en/posts/key-considerations-before-using-swiftdata/)
- [SwiftData background tasks - Use Your Loaf](https://useyourloaf.com/blog/swiftdata-background-tasks/)
- [Swift 6.2 approachable concurrency - Avanderlee](https://www.avanderlee.com/concurrency/approachable-concurrency-in-swift-6-2-a-clear-guide/)
- [Xcode Cloud custom build scripts - Apple docs](https://developer.apple.com/documentation/xcode/writing-custom-build-scripts)
- [String Catalogs - Apple WWDC23](https://developer.apple.com/videos/play/wwdc2023/10155/)

### Tertiary (LOW confidence)
- [GRDB vs SwiftData stability claims](https://fatbobman.com/en/posts/key-considerations-before-using-swiftdata/) -- stability varies by iOS version and workload; needs real-device validation
- [SwiftData iOS 18 memory issues - Apple Developer Forums](https://developer.apple.com/forums/thread/761522) -- anecdotal; verify with Instruments

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official repos/docs, versions confirmed
- Architecture: HIGH - Patterns well-established for iOS 17+ SwiftUI apps with Observation framework
- Pitfalls: MEDIUM - SwiftData stability concerns are real but version-dependent; need real-device testing
- Offline sync: MEDIUM - SwiftData + ModelActor pattern is documented but complex; background URLSession for downloads is standard

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (30 days -- stack is stable, no WWDC until June)

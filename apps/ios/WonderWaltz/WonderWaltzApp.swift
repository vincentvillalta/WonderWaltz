import SwiftUI
import SwiftData
import WWCore
import WWAnalytics
import WWOffline

/// Main app entry point.
/// Initializes crash reporting, analytics, DI container, and model container
/// before rendering any views.
@main
struct WonderWaltzApp: App {

    /// The DI container with all concrete service implementations.
    @State private var container: DependencyContainer

    /// The root app state driving navigation.
    @State private var appState = AppState()

    /// The SwiftData model container for offline storage.
    private let modelContainer: ModelContainer

    init() {
        WWLogger.app.debug("WonderWaltzApp init — build=\(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "?", privacy: .public) API=\(AppConfig.apiBaseURL.absoluteString, privacy: .public)")

        // CRITICAL: Initialize Sentry BEFORE any view renders (IOS-14 requirement).
        let dsn = AppConfig.sentryDSN
        if !dsn.isEmpty {
            CrashReportingService.initialize(dsn: dsn)
            WWLogger.app.debug("Sentry initialized")
        } else {
            WWLogger.app.debug("Sentry DSN not set — crash reporting disabled")
        }

        // Initialize PostHog analytics.
        let postHogKey = AppConfig.postHogAPIKey
        if !postHogKey.isEmpty {
            PostHogAnalyticsService.initialize(
                apiKey: postHogKey,
                host: AppConfig.postHogHost
            )
            WWLogger.app.debug("PostHog initialized")
        } else {
            WWLogger.app.debug("PostHog API key not set — analytics disabled")
        }

        // Wire DI container with all concrete implementations.
        let deps = MainActor.assumeIsolated {
            DISetup.makeContainer()
        }
        _container = State(initialValue: deps)
        WWLogger.app.debug("DI container wired")

        // Create SwiftData ModelContainer from WWOffline configuration.
        do {
            let container = try ModelContainerConfig.makeContainer()
            modelContainer = container
            WWLogger.offline.debug("SwiftData ModelContainer created")

            // Create OfflineStore and wire it into DI container.
            let store = OfflineStore(modelContainer: container)
            MainActor.assumeIsolated {
                deps.offlineStore = store
                deps.wizardDraftStore = WizardDraftStoreBridge(store: store)
            }
            WWLogger.offline.debug("OfflineStore + WizardDraftStoreBridge wired into DI")
        } catch {
            WWLogger.app.fault("Failed to create ModelContainer: \(error.localizedDescription, privacy: .public)")
            fatalError("Failed to create ModelContainer: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            AppRouter(appState: appState)
                .environment(container)
                .modelContainer(modelContainer)
        }
    }
}

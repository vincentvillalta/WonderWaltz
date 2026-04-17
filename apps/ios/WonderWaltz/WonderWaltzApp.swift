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
        // CRITICAL: Initialize Sentry BEFORE any view renders (IOS-14 requirement).
        let dsn = AppConfig.sentryDSN
        if !dsn.isEmpty {
            CrashReportingService.initialize(dsn: dsn)
        }

        // Initialize PostHog analytics.
        let postHogKey = AppConfig.postHogAPIKey
        if !postHogKey.isEmpty {
            PostHogAnalyticsService.initialize(
                apiKey: postHogKey,
                host: AppConfig.postHogHost
            )
        }

        // Wire DI container with all concrete implementations.
        // App struct body is implicitly @MainActor — use MainActor.assumeIsolated
        // since App.init runs on the main thread.
        let deps = MainActor.assumeIsolated {
            DISetup.makeContainer()
        }
        _container = State(initialValue: deps)

        // Create SwiftData ModelContainer from WWOffline configuration.
        do {
            modelContainer = try ModelContainerConfig.makeContainer()
        } catch {
            // Fatal — app cannot function without data persistence.
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

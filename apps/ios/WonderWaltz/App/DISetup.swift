import Foundation
import WWCore
import WWAnalytics

/// Factory that wires concrete implementations into the DependencyContainer.
/// This is the ONLY place where concrete types are created.
/// Feature packages never see concrete implementations.
enum DISetup {

    /// Create a fully wired DependencyContainer.
    /// - Returns: A container with all concrete service implementations.
    @MainActor
    static func makeContainer() -> DependencyContainer {
        let keychainStore = KeychainStore()

        // AuthService needs apiClient for anonymous auth,
        // but APIClient needs authMiddleware from AuthService.
        // Resolve with a two-phase setup: create auth first without apiClient,
        // then wire apiClient after.
        let authService = AuthService(keychainStore: keychainStore)

        let authMiddleware = AuthMiddleware(
            tokenProvider: { authService.getToken() }
        )

        let serverURL = AppConfig.apiBaseURL
        let apiClient = APIClient(
            serverURL: serverURL,
            authMiddleware: authMiddleware
        )

        let analytics = PostHogAnalyticsService()

        // OfflineStore is created separately since it needs ModelContainer.
        // It will be set on the container after ModelContainer is configured.
        return DependencyContainer(
            apiClient: apiClient,
            authService: authService,
            analytics: analytics,
            keychainStore: keychainStore
        )
    }
}

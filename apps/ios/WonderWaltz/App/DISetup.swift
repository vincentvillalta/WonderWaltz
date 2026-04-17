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

        // Two-phase DI: AuthMiddleware reads tokens from AuthService, and
        // AuthService needs APIClient for anonymous auth. Create auth first,
        // then build APIClient, then attach it back to AuthService.
        let authService = AuthService(keychainStore: keychainStore)

        let authMiddleware = AuthMiddleware(
            tokenProvider: { authService.getToken() }
        )

        let serverURL = AppConfig.apiBaseURL
        let apiClient = APIClient(
            serverURL: serverURL,
            authMiddleware: authMiddleware
        )

        // Close the DI cycle — AuthService can now call anonymousAuth.
        authService.attachAPIClient(apiClient)

        let analytics = PostHogAnalyticsService()

        return DependencyContainer(
            apiClient: apiClient,
            authService: authService,
            analytics: analytics,
            keychainStore: keychainStore
        )
    }
}

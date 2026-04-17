import Foundation
import Observation

/// Central dependency container that wires protocol-based services.
/// The main app target creates concrete instances and injects them here.
/// Feature packages receive protocols via @Environment or init injection.
@Observable
public final class DependencyContainer: @unchecked Sendable {

    /// The API client for making network requests.
    public var apiClient: any APIClientProtocol

    /// The authentication service for managing user sessions.
    public var authService: any AuthServiceProtocol

    /// The analytics service for event capture.
    public var analytics: any AnalyticsProtocol

    /// The keychain store for secure token storage.
    public var keychainStore: any KeychainStoreProtocol

    /// The offline store for plan caching (optional, set when WWOffline is configured).
    public var offlineStore: (any OfflineStoreProtocol)?

    /// Opaque wizard draft store, set by the app target after OfflineStore is created.
    /// Typed as `Any` to avoid WWCore depending on WWTripWizard.
    public var wizardDraftStore: (any Sendable)?

    public init(
        apiClient: any APIClientProtocol,
        authService: any AuthServiceProtocol,
        analytics: any AnalyticsProtocol,
        keychainStore: any KeychainStoreProtocol,
        offlineStore: (any OfflineStoreProtocol)? = nil
    ) {
        self.apiClient = apiClient
        self.authService = authService
        self.analytics = analytics
        self.keychainStore = keychainStore
        self.offlineStore = offlineStore
    }
}

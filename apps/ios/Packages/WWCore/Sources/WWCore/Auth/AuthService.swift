import Foundation
import Observation

/// Observable authentication service that manages user sessions.
/// Performs silent anonymous auth on first launch and persists tokens
/// in the keychain.
@Observable
@MainActor
public final class AuthService: AuthServiceProtocol, @unchecked Sendable {

    /// The current JWT token, if authenticated.
    public private(set) var token: String?

    /// Whether the user is currently authenticated.
    public var isAuthenticated: Bool { token != nil }

    /// Whether an auth attempt is pending (failed and needs retry).
    public private(set) var authPending: Bool = false

    private let keychainStore: any KeychainStoreProtocol
    private var apiClient: (any APIClientProtocol)?

    /// Initialize the auth service.
    /// - Parameters:
    ///   - keychainStore: The keychain store for token persistence.
    ///   - apiClient: The API client for anonymous auth calls.
    ///     Pass nil during initial setup (before DI container is wired).
    public init(
        keychainStore: any KeychainStoreProtocol,
        apiClient: (any APIClientProtocol)? = nil
    ) {
        self.keychainStore = keychainStore
        self.apiClient = apiClient
    }

    /// Wire the API client after initialization (two-phase DI).
    /// AuthMiddleware needs AuthService for the token provider, but AuthService
    /// needs APIClient for anonymous auth — this breaks the cycle.
    public func attachAPIClient(_ client: any APIClientProtocol) {
        self.apiClient = client
        WWLogger.auth.debug("APIClient attached to AuthService")
    }

    /// Perform silent authentication.
    /// Tries keychain first, then falls back to anonymous auth.
    /// On failure, sets `authPending = true` for later retry.
    public func silentAuth() async {
        WWLogger.auth.trace("silentAuth start")
        // Try keychain first
        if let storedToken = keychainStore.getToken() {
            WWLogger.auth.debug("silentAuth: token found in keychain (len=\(storedToken.count))")
            token = storedToken
            authPending = false
            return
        }

        // Fall back to anonymous auth
        guard let apiClient else {
            WWLogger.auth.error("silentAuth: no API client configured — auth pending")
            authPending = true
            return
        }

        do {
            WWLogger.auth.debug("silentAuth: no stored token, calling anonymousAuth()")
            let newToken = try await apiClient.anonymousAuth()
            try? keychainStore.saveToken(newToken)
            token = newToken
            authPending = false
            WWLogger.auth.debug("silentAuth: anonymous session established")
        } catch {
            // Don't block the user — set pending flag for retry
            WWLogger.auth.error("silentAuth failed: \(error.localizedDescription, privacy: .public) — will retry")
            authPending = true
        }
    }

    /// Retrieve the current token synchronously.
    public nonisolated func getToken() -> String? {
        // Access keychain directly for synchronous reads
        keychainStore.getToken()
    }

    /// Clear the in-memory and keychain token. Used when the server returns 401
    /// (stale session) so the next `silentAuth()` fetches a fresh anonymous session.
    public func resetSession() async {
        WWLogger.auth.debug("resetSession: clearing token")
        token = nil
        authPending = true
        try? keychainStore.deleteToken()
    }
}

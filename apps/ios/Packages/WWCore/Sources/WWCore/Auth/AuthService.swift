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
    private let apiClient: (any APIClientProtocol)?

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

    /// Perform silent authentication.
    /// Tries keychain first, then falls back to anonymous auth.
    /// On failure, sets `authPending = true` for later retry.
    public func silentAuth() async {
        // Try keychain first
        if let storedToken = keychainStore.getToken() {
            token = storedToken
            authPending = false
            return
        }

        // Fall back to anonymous auth
        guard let apiClient else {
            authPending = true
            return
        }

        do {
            let newToken = try await apiClient.anonymousAuth()
            try? keychainStore.saveToken(newToken)
            token = newToken
            authPending = false
        } catch {
            // Don't block the user — set pending flag for retry
            authPending = true
        }
    }

    /// Retrieve the current token synchronously.
    public nonisolated func getToken() -> String? {
        // Access keychain directly for synchronous reads
        keychainStore.getToken()
    }
}

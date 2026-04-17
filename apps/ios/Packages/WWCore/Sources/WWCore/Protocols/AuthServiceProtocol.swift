import Foundation

/// Protocol for the authentication service.
/// Feature packages use this to check auth state and retrieve tokens.
/// Marked @MainActor since it drives UI state via Observation.
@MainActor
public protocol AuthServiceProtocol: AnyObject {

    /// Whether the user is currently authenticated (has a valid token).
    var isAuthenticated: Bool { get }

    /// The current JWT token, if available.
    var token: String? { get }

    /// Perform silent authentication (keychain lookup, then anonymous auth fallback).
    func silentAuth() async

    /// Retrieve the current token synchronously.
    nonisolated func getToken() -> String?
}

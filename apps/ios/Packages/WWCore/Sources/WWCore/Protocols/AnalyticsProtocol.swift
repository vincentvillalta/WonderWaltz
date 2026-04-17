import Foundation

/// Protocol for analytics event capture.
/// Concrete implementations wrap PostHog or other analytics SDKs.
public protocol AnalyticsProtocol: Sendable {

    /// Capture an event with optional properties.
    func capture(_ event: String, properties: [String: Any])

    /// Identify a user by their ID.
    func identify(_ userId: String)

    /// Reset the current user identity (e.g., on logout).
    func reset()
}

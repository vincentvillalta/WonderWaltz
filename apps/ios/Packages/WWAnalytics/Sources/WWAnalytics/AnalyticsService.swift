import Foundation
import PostHog

/// Concrete analytics service wrapping PostHog.
/// CRITICAL: Filters out forbidden age-related properties before sending.
public final class PostHogAnalyticsService: @unchecked Sendable {

    /// Properties that must NEVER be sent to analytics.
    /// Case-insensitive check applied before every capture.
    public static let forbiddenProperties: Set<String> = [
        "guest_age",
        "age_bracket",
        "guest_age_bracket",
        "age",
        "dob",
        "birthdate",
        "birth_date",
    ]

    /// Initialize PostHog with the given API key and host.
    /// - Parameters:
    ///   - apiKey: The PostHog project API key.
    ///   - host: The PostHog host URL (default: PostHog cloud).
    public static func initialize(
        apiKey: String,
        host: String = "https://us.i.posthog.com"
    ) {
        let config = PostHogConfig(apiKey: apiKey, host: host)
        PostHogSDK.shared.setup(config)
    }

    public init() {}

    /// Filter out forbidden properties (case-insensitive).
    /// - Parameter properties: The raw event properties.
    /// - Returns: Properties with forbidden keys removed.
    public func filterProperties(
        _ properties: [String: Any]
    ) -> [String: Any] {
        properties.filter { key, _ in
            !Self.forbiddenProperties.contains(key.lowercased())
        }
    }
}

// MARK: - AnalyticsProtocol (from WWCore)

// Note: We can't directly import WWCore here (circular dep).
// The main app target bridges this by conforming via extension or wrapper.
// For testability, the filtering logic is exposed as a public method.

extension PostHogAnalyticsService {

    /// Capture an analytics event with forbidden property filtering.
    /// - Parameters:
    ///   - event: The event name.
    ///   - properties: The event properties (forbidden keys will be stripped).
    public func capture(_ event: String, properties: [String: Any]) {
        let filtered = filterProperties(properties)
        PostHogSDK.shared.capture(event, properties: filtered)
    }

    /// Identify a user by their ID.
    /// - Parameter userId: The user identifier.
    public func identify(_ userId: String) {
        PostHogSDK.shared.identify(userId)
    }

    /// Reset the current user identity.
    public func reset() {
        PostHogSDK.shared.reset()
    }
}

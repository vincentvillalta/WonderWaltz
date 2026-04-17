import Foundation

/// App configuration sourced from Info.plist / build settings.
/// DSN and API keys are NEVER hardcoded.
enum AppConfig {

    // MARK: - Info.plist Helpers

    private static func infoPlistString(for key: String) -> String? {
        Bundle.main.infoDictionary?[key] as? String
    }

    // MARK: - Sentry

    /// Sentry DSN from Info.plist (key: SENTRY_DSN).
    static var sentryDSN: String {
        infoPlistString(for: "SENTRY_DSN") ?? ""
    }

    // MARK: - PostHog

    /// PostHog API key from Info.plist (key: POSTHOG_API_KEY).
    static var postHogAPIKey: String {
        infoPlistString(for: "POSTHOG_API_KEY") ?? ""
    }

    /// PostHog host URL (default: PostHog cloud US).
    static var postHogHost: String {
        infoPlistString(for: "POSTHOG_HOST") ?? "https://us.i.posthog.com"
    }

    // MARK: - API

    /// API base URL from Info.plist (key: API_BASE_URL).
    static var apiBaseURL: URL {
        let urlString = infoPlistString(for: "API_BASE_URL")
            ?? "https://api.wonderwaltz.com"
        return URL(string: urlString)!
    }
}

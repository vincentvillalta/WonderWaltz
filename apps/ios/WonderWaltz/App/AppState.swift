import Foundation
import Observation

/// Root observable state driving app navigation.
/// Persists onboarding completion in UserDefaults.
@Observable
@MainActor
final class AppState {

    /// Possible navigation routes for the app.
    enum AppRoute: Sendable, Equatable {
        case splash
        case onboarding
        case main
    }

    /// The current navigation route.
    var currentRoute: AppRoute = .splash

    /// Whether the user has completed onboarding (persisted in UserDefaults).
    var hasCompletedOnboarding: Bool {
        get { UserDefaults.standard.bool(forKey: Self.onboardingKey) }
        set { UserDefaults.standard.set(newValue, forKey: Self.onboardingKey) }
    }

    /// Whether to show the auth banner (e.g., when user tries action needing auth but is offline).
    var showAuthBanner: Bool = false

    /// Banner message displayed when auth is unavailable.
    var authBannerMessage: String = String(
        localized: "No internet \u{2014} connect to save your trip",
        comment: "Auth banner message when offline"
    )

    private static let onboardingKey = "hasCompletedOnboarding"
}

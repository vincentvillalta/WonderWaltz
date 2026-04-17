import Foundation
import Observation

/// Observable view model managing onboarding page state.
/// Tracks current page and handles navigation (advance/skip).
@Observable
@MainActor
public final class OnboardingViewModel {

    /// The current page index (0-based).
    public var currentPage: Int = 0

    /// Total number of onboarding pages.
    public var totalPages: Int { Self.pages.count }

    /// Completion handler called when onboarding finishes.
    private let onComplete: @MainActor () -> Void

    /// The onboarding page definitions.
    public static let pages: [OnboardingPage] = [
        OnboardingPage(
            systemImage: "wand.and.stars",
            titleKey: "Your Disney Expert, In Your Pocket",
            subtitleKey: "AI-powered plans tailored to your party, preferences, and pace."
        ),
        OnboardingPage(
            systemImage: "text.badge.checkmark",
            titleKey: "Tell Us About Your Trip",
            subtitleKey: "Answer a few quick questions and we handle the rest."
        ),
        OnboardingPage(
            systemImage: "clock.badge.checkmark",
            titleKey: "Personalized Down to the Minute",
            subtitleKey: "Optimized schedules that adapt to crowds, weather, and your energy."
        ),
        OnboardingPage(
            systemImage: "iphone.and.arrow.down",
            titleKey: "Works Even Offline",
            subtitleKey: "Download your plan and access it anywhere in the parks."
        ),
    ]

    /// Initialize the view model.
    /// - Parameter onComplete: Called when the user finishes or skips onboarding.
    public init(onComplete: @escaping @MainActor () -> Void) {
        self.onComplete = onComplete
    }

    /// Advance to the next page, or finish if on the last page.
    public func advancePage() {
        if currentPage < totalPages - 1 {
            currentPage += 1
        } else {
            onComplete()
        }
    }

    /// Skip onboarding immediately, regardless of current page.
    public func skip() {
        onComplete()
    }
}

/// Data model for a single onboarding page.
public struct OnboardingPage: Sendable, Identifiable {
    public let id = UUID()

    /// SF Symbol name for the illustration placeholder.
    public let systemImage: String

    /// Localized title key.
    public let titleKey: String

    /// Localized subtitle key.
    public let subtitleKey: String
}

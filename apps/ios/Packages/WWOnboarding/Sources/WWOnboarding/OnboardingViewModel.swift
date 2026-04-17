import Foundation
import Observation
import SwiftUI

/// Observable view model managing onboarding page state.
/// Tracks current page and handles navigation (advance/skip).
///
/// Slide data matches React Onboarding.tsx exactly (lines 9-33):
/// 4 slides with gradient icon backgrounds, specific titles, and descriptions.
@Observable
@MainActor
public final class OnboardingViewModel {

    /// The current page index (0-based).
    public var currentPage: Int = 0

    /// Total number of onboarding pages.
    public var totalPages: Int { Self.pages.count }

    /// Completion handler called when onboarding finishes.
    private let onComplete: @MainActor () -> Void

    /// The onboarding page definitions matching Onboarding.tsx slides array.
    public static let pages: [OnboardingPage] = [
        OnboardingPage(
            iconSystemName: "sparkles",
            titleKey: "Your Disney Concierge",
            subtitleKey: "AI-powered planning that turns your Disney World trip into an effortless adventure.",
            gradientColors: [
                Color(red: 1.0, green: 0.420, blue: 0.616),   // #FF6B9D MK pink
                Color(red: 0.910, green: 0.710, blue: 0.278)   // #E8B547 gold
            ]
        ),
        OnboardingPage(
            iconSystemName: "calendar",
            titleKey: "Minute-by-Minute Magic",
            subtitleKey: "Smart itineraries optimized for your party, pace, and priorities\u{2014}no spreadsheets needed.",
            gradientColors: [
                Color(red: 0.0, green: 0.749, blue: 0.647),    // #00BFA5 EPCOT teal
                Color(red: 0.024, green: 0.839, blue: 0.627)   // #06D6A0 AK green
            ]
        ),
        OnboardingPage(
            iconSystemName: "location.fill",
            titleKey: "Live In-Park Guide",
            subtitleKey: "Real-time reshuffles, wait-aware routing, and walking directions right when you need them.",
            gradientColors: [
                Color(red: 0.902, green: 0.224, blue: 0.275),  // #E63946 HS red
                Color(red: 1.0, green: 0.420, blue: 0.616)     // #FF6B9D MK pink
            ]
        ),
        OnboardingPage(
            iconSystemName: "wand.and.stars",
            titleKey: "Ready to Begin?",
            subtitleKey: "Create your first trip and experience Disney like never before.",
            gradientColors: [
                Color(red: 0.910, green: 0.710, blue: 0.278),  // #E8B547 gold
                Color(red: 1.0, green: 0.420, blue: 0.616)     // #FF6B9D MK pink
            ]
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
/// Matches Onboarding.tsx slide structure: icon, title, description, gradient.
public struct OnboardingPage: Sendable, Identifiable {
    public let id = UUID()

    /// SF Symbol name for the icon (maps from Lucide icons in React).
    public let iconSystemName: String

    /// Localized title key -- Fraunces display font.
    public let titleKey: String

    /// Localized subtitle key -- Inter body font.
    public let subtitleKey: String

    /// Gradient colors for the icon container background.
    public let gradientColors: [Color]
}

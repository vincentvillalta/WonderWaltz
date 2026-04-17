import SwiftUI

/// Container view for the onboarding flow with swipeable pages.
public struct OnboardingContainerView: View {

    /// Called when onboarding completes (user taps "Get Started" or "Skip").
    private let onComplete: @MainActor () -> Void

    public init(onComplete: @escaping @MainActor () -> Void) {
        self.onComplete = onComplete
    }

    public var body: some View {
        // Stub — full implementation in Task 2
        Color.clear
            .task {
                onComplete()
            }
    }
}

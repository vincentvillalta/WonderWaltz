import SwiftUI
import WWCore

/// Splash screen displayed on app launch.
/// Shows WonderWaltz brand mark while performing silent authentication in the background.
public struct SplashView: View {

    /// Called when splash completes (auth finished or timed out).
    private let onComplete: @MainActor () -> Void

    @Environment(DependencyContainer.self) private var deps

    /// Minimum display time for brand impression.
    private let minimumDisplayTime: TimeInterval = 1.5

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

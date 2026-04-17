import SwiftUI
import WWCore
import WWDesignSystem

/// Splash screen displayed on app launch.
/// Shows WonderWaltz brand mark centered on cream background while performing
/// silent authentication in the background.
///
/// Per CONTEXT.md: silent auth, no loading indicator. Auth failure does not block
/// the user -- they proceed to the next screen. Sets `authPending = true` on failure
/// for later retry.
public struct SplashView: View {

    /// Called when splash completes (auth finished or minimum time elapsed).
    private let onComplete: @MainActor () -> Void

    @Environment(DependencyContainer.self) private var deps

    /// Minimum display time for brand impression (seconds).
    private static let minimumDisplayTime: TimeInterval = 1.5

    public init(onComplete: @escaping @MainActor () -> Void) {
        self.onComplete = onComplete
    }

    public var body: some View {
        ZStack {
            WWTheme.background
                .ignoresSafeArea()

            VStack(spacing: 24) {
                Image(systemName: "sparkles")
                    .font(.system(size: 64))
                    .foregroundStyle(WWTheme.accent)
                    .accessibilityLabel(Text("WonderWaltz logo",
                                             comment: "Splash screen logo accessibility label"))

                Text("WonderWaltz")
                    .font(WWTypography.largeTitle)
                    .foregroundStyle(WWTheme.textPrimary)
            }
        }
        .task {
            await performSplashSequence()
        }
    }

    /// Runs silent auth and minimum display time concurrently.
    /// Whichever takes longer determines when splash completes.
    private func performSplashSequence() async {
        await withTaskGroup(of: Void.self) { group in
            // Task 1: Silent auth (fire-and-forget, never blocks).
            group.addTask {
                await deps.authService.silentAuth()
            }

            // Task 2: Minimum display time for brand impression.
            group.addTask {
                try? await Task.sleep(for: .seconds(Self.minimumDisplayTime))
            }

            // Wait for BOTH to finish.
            for await _ in group {}
        }

        onComplete()
    }
}

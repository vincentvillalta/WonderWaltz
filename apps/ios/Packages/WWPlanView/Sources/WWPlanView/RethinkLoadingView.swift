import SwiftUI
import WWDesignSystem

/// Inline loading overlay shown during rethink-my-day.
/// Per CONTEXT.md: "inline loading with current plan visible. Plan stays visible
/// but slightly dimmed. Floating progress indicator says 'Rethinking your day...'.
/// Items animate to new positions when done."
/// Respects `@Environment(\.accessibilityReduceMotion)` for instant transitions.
public struct RethinkLoadingView: View {

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var isAnimating = false

    public init() {}

    public var body: some View {
        ZStack {
            // Semi-transparent overlay — plan visible but dimmed
            Color.black.opacity(0.25)
                .ignoresSafeArea()
                .accessibilityHidden(true)

            // Floating card with spinner
            VStack(spacing: WWDesignTokens.spacing6) {
                ProgressView()
                    .controlSize(.large)
                    .tint(WWTheme.accent)

                Text("Rethinking your day...")
                    .font(WWTypography.headline)
                    .foregroundStyle(WWTheme.textPrimary)

                Text("Finding a better plan based on current conditions")
                    .font(WWTypography.caption)
                    .foregroundStyle(WWTheme.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding(WWDesignTokens.spacing12)
            .background(
                RoundedRectangle(cornerRadius: WWDesignTokens.radiusLg)
                    .fill(WWTheme.surface)
            )
            .shadow(color: .black.opacity(0.15), radius: 16, x: 0, y: 8)
            .padding(.horizontal, WWDesignTokens.spacing16)
            .scaleEffect(isAnimating ? 1.0 : 0.9)
            .opacity(isAnimating ? 1.0 : 0.0)
            .onAppear {
                if reduceMotion {
                    isAnimating = true
                } else {
                    withAnimation(.spring(duration: 0.4, bounce: 0.3)) {
                        isAnimating = true
                    }
                }
            }
            .accessibilityLabel("Rethinking your day. Please wait.")
        }
    }
}

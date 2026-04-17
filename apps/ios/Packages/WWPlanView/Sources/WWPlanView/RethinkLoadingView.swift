import SwiftUI
import WWDesignSystem

/// Inline loading overlay shown during rethink-my-day.
/// Stub — full implementation in Task 2.
public struct RethinkLoadingView: View {

    public init() {}

    public var body: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()

            VStack(spacing: WWDesignTokens.spacing6) {
                ProgressView()
                    .tint(WWTheme.accent)
                Text("Rethinking your day...")
                    .font(WWTypography.headline)
                    .foregroundStyle(WWTheme.textPrimary)
            }
            .padding(WWDesignTokens.spacing12)
            .background(WWTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: WWDesignTokens.radiusLg))
            .shadow(color: .black.opacity(0.15), radius: 12)
        }
    }
}

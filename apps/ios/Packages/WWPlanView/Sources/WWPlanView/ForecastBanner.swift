import SwiftUI
import WWDesignSystem

/// Dismissible info banner explaining that wait time forecasts are in beta.
/// Per CONTEXT.md: "separate info section/banner at top of plan view explaining
/// 'Wait time forecasts are in beta' -- NOT per-item badges. One-time framing"
/// Satisfies FC-05 requirement for "Beta Forecast" framing.
public struct ForecastBanner: View {

    /// UserDefaults key for persisting dismissal.
    static let dismissedKey = "forecastBannerDismissed"

    @State private var isDismissed: Bool

    public init() {
        _isDismissed = State(initialValue: UserDefaults.standard.bool(forKey: Self.dismissedKey))
    }

    public var body: some View {
        if !isDismissed {
            HStack(alignment: .top, spacing: WWDesignTokens.spacing4) {
                Image(systemName: "info.circle")
                    .foregroundStyle(WWTheme.textSecondary)
                    .font(.body)

                Text("Wait time forecasts are in beta. Actual wait times may vary.")
                    .font(WWTypography.footnote)
                    .foregroundStyle(WWTheme.textPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Button {
                    withAnimation(.easeOut(duration: 0.2)) {
                        isDismissed = true
                    }
                    UserDefaults.standard.set(true, forKey: Self.dismissedKey)
                } label: {
                    Image(systemName: "xmark")
                        .font(.caption)
                        .foregroundStyle(WWTheme.textSecondary)
                        .frame(
                            minWidth: WWDesignTokens.iconographyMinTapTarget,
                            minHeight: WWDesignTokens.iconographyMinTapTarget
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Dismiss forecast banner")
            }
            .padding(WWDesignTokens.spacing6)
            .background(
                RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                    .fill(WWTheme.background)
                    .strokeBorder(WWTheme.muted, lineWidth: 1)
            )
            .padding(.horizontal, WWDesignTokens.spacing8)
            .transition(.opacity.combined(with: .move(edge: .top)))
        }
    }
}

import SwiftUI
import WWDesignSystem

/// Blur overlay for locked days (Days 2+, free tier).
/// Per CONTEXT.md: "blurred cards with centered 'Unlock Trip $9.99' CTA overlaying
/// the blurred content. User can see they have a multi-day plan but can't read details."
/// Uses WWBlurOverlay from design system with .ultraThinMaterial blur.
/// onUnlockTap closure triggers paywall (Phase 6 -- placeholder for now).
/// WWBlurOverlay provides .isModal trait so VoiceOver focuses within the overlay.
public struct LockedDayOverlay: View {

    public let onUnlockTap: () -> Void

    public init(onUnlockTap: @escaping () -> Void = {}) {
        self.onUnlockTap = onUnlockTap
    }

    public var body: some View {
        WWBlurOverlay(onAction: onUnlockTap) {
            Image(systemName: "lock.fill")
                .font(.largeTitle)
                .foregroundStyle(WWTheme.primary)
                .accessibilityHidden(true)

            VStack(spacing: WWDesignTokens.spacing2) {
                Text("Unlock Your Full Trip")
                    .font(WWTypography.title3)
                    .foregroundStyle(WWTheme.textPrimary)
                    .lineLimit(nil)
                    .fixedSize(horizontal: false, vertical: true)

                Text("See your complete multi-day plan with all details")
                    .font(WWTypography.subheadline)
                    .foregroundStyle(WWTheme.textSecondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(nil)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, WWDesignTokens.spacing16)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Day is locked. Unlock full trip for nine dollars and ninety-nine cents")
        .accessibilityAddTraits(.isButton)
    }
}

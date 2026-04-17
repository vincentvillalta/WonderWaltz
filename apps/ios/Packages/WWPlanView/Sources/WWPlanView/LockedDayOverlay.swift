import SwiftUI
import WWDesignSystem

/// Blur overlay for locked days (Days 2+, free tier).
/// Stub — full implementation in Task 2.
public struct LockedDayOverlay: View {

    public let onUnlockTap: () -> Void

    public init(onUnlockTap: @escaping () -> Void = {}) {
        self.onUnlockTap = onUnlockTap
    }

    public var body: some View {
        WWBlurOverlay(onAction: onUnlockTap) {
            Image(systemName: "lock.fill")
                .font(.title)
                .foregroundStyle(WWTheme.primary)
            Text("Unlock your full trip plan")
                .font(WWTypography.headline)
                .foregroundStyle(WWTheme.textPrimary)
        }
        .accessibilityLabel("Day is locked. Unlock full trip for nine dollars and ninety-nine cents")
    }
}

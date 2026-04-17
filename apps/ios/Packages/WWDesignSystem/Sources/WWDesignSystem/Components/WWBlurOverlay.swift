import SwiftUI

/// Blur overlay with centered content slot.
/// Used for locked day overlay with "Unlock Trip" CTA.
public struct WWBlurOverlay<Content: View>: View {

    private let content: Content
    private let onAction: (() -> Void)?

    /// Create a blur overlay.
    /// - Parameters:
    ///   - onAction: Optional action closure for CTA tap.
    ///   - content: The centered content to show over the blur.
    public init(
        onAction: (() -> Void)? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.onAction = onAction
        self.content = content()
    }

    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    public var body: some View {
        ZStack {
            if reduceTransparency {
                // Solid background when reduce transparency is ON
                Rectangle()
                    .fill(WWTheme.surface.opacity(0.95))
            } else {
                Rectangle()
                    .fill(.ultraThinMaterial)
            }

            VStack(spacing: WWDesignTokens.spacing6) {
                content

                if let onAction {
                    WWButton("Unlock Trip $9.99", action: onAction)
                        .frame(maxWidth: 240)
                }
            }
        }
        .accessibilityAddTraits(.isModal)
        .accessibilityElement(children: .contain)
    }
}

#Preview {
    ZStack {
        VStack {
            Text("Day 2 Plan")
            Text("Hidden content behind blur")
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)

        WWBlurOverlay(onAction: { }) {
            Image(systemName: "lock.fill")
                .font(.title)
                .foregroundStyle(WWTheme.primary)

            Text("Unlock your full trip plan")
                .font(WWTypography.headline)
                .foregroundStyle(WWTheme.textPrimary)
        }
    }
    .frame(height: 300)
}

import SwiftUI

/// Rounded card container matching React pattern: bg-card border border-border rounded-2xl.
/// White background, rounded-2xl (16pt), border of navy at 10% opacity.
/// Used by wizard steps and plan items.
public struct WWCard<Content: View>: View {

    private let content: Content

    /// Create a card container.
    /// - Parameter content: The card's content via ViewBuilder.
    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        content
            .padding(WWDesignTokens.spacing8)
            .background(WWTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: WWDesignTokens.radiusBase)) // rounded-2xl = 16pt
            .overlay(
                RoundedRectangle(cornerRadius: WWDesignTokens.radiusBase)
                    .stroke(WWTheme.border, lineWidth: 1) // border border-border
            )
            .accessibilityElement(children: .combine)
    }
}

#Preview {
    WWCard {
        VStack(alignment: .leading, spacing: 8) {
            Text("Space Mountain")
                .font(WWTypography.headline)
            Text("Magic Kingdom")
                .font(WWTypography.caption)
                .foregroundStyle(WWTheme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding()
    .background(WWTheme.background)
}

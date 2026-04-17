import SwiftUI

/// Rounded card container with shadow and cream/white background.
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
            .clipShape(RoundedRectangle(cornerRadius: WWDesignTokens.radiusLg))
            .shadow(
                color: WWTheme.primary.opacity(0.08),
                radius: 8,
                x: 0,
                y: 4
            )
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

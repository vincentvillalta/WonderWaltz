import SwiftUI

/// WonderWaltz branded button with primary (gold bg, navy text)
/// and secondary (outlined) styles. Min 44pt tap target.
public struct WWButton: View {

    public enum Style: Sendable {
        case primary
        case secondary
    }

    private let title: String
    private let style: Style
    private let isLoading: Bool
    private let action: () -> Void

    /// Create a WonderWaltz button.
    /// - Parameters:
    ///   - title: The button label text.
    ///   - style: `.primary` (gold bg) or `.secondary` (outlined).
    ///   - isLoading: Show spinner instead of label when true.
    ///   - action: The action to perform on tap.
    public init(
        _ title: String,
        style: Style = .primary,
        isLoading: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.style = style
        self.isLoading = isLoading
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Group {
                if isLoading {
                    ProgressView()
                        .tint(foregroundColor)
                } else {
                    Text(title)
                        .font(WWTypography.button)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(minHeight: WWDesignTokens.iconographyMinTapTarget)
            .padding(.horizontal, WWDesignTokens.spacing8)
        }
        .background(backgroundColor)
        .foregroundStyle(foregroundColor)
        .clipShape(RoundedRectangle(cornerRadius: WWDesignTokens.radiusMd))
        .overlay {
            if style == .secondary {
                RoundedRectangle(cornerRadius: WWDesignTokens.radiusMd)
                    .strokeBorder(WWTheme.primary, lineWidth: 1.5)
            }
        }
        .buttonStyle(.plain)
    }

    private var backgroundColor: Color {
        switch style {
        case .primary: WWTheme.accent
        case .secondary: .clear
        }
    }

    private var foregroundColor: Color {
        switch style {
        case .primary: WWTheme.textOnAccent
        case .secondary: WWTheme.primary
        }
    }
}

#Preview {
    VStack(spacing: 16) {
        WWButton("Get Started") { }
        WWButton("Learn More", style: .secondary) { }
        WWButton("Loading...", isLoading: true) { }
    }
    .padding()
    .background(WWTheme.background)
}

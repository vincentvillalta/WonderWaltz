import SwiftUI

/// WonderWaltz branded button with navy primary background, gold shimmer sweep,
/// secondary outlined style, and compact inline style.
/// Matches React Onboarding.tsx CTA pattern: navy bg, cream text, gold shimmer overlay.
public struct WWButton: View {

    public enum Style: Sendable {
        /// Navy (#1B2A4E) bg, cream text, full-width, 56pt height, gold shimmer sweep.
        case primary
        /// Transparent bg, navy border (1.5pt), navy text, full-width, 56pt height.
        case secondary
        /// Navy bg, cream text, auto-width (px-6 py-3), gold shimmer. For inline CTAs.
        case compact
    }

    private let title: String
    private let style: Style
    private let isLoading: Bool
    private let action: () -> Void

    @State private var shimmerOffset: CGFloat = -1
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// Create a WonderWaltz button.
    /// - Parameters:
    ///   - title: The button label text.
    ///   - style: `.primary` (navy bg + shimmer), `.secondary` (outlined), or `.compact` (inline CTA).
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
            content
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(.isButton)
        .accessibilityLabel(Text(isLoading ? "Loading" : title))
    }

    @ViewBuilder
    private var content: some View {
        Group {
            if isLoading {
                ProgressView()
                    .tint(foregroundColor)
            } else {
                HStack(spacing: 6) {
                    Text(title)
                        .font(WWTypography.button)
                    if style != .secondary {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .semibold))
                    }
                }
            }
        }
        .frame(maxWidth: isFullWidth ? .infinity : nil)
        .frame(minHeight: buttonHeight)
        .padding(.horizontal, horizontalPadding)
        .foregroundStyle(foregroundColor)
        .background {
            if hasBackground {
                RoundedRectangle(cornerRadius: WWDesignTokens.radiusBase)
                    .fill(backgroundColor)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: WWDesignTokens.radiusBase))
        .overlay {
            // Gold shimmer sweep for primary & compact
            if hasShimmer {
                GeometryReader { geo in
                    let width = geo.size.width
                    LinearGradient(
                        colors: [
                            WWDesignTokens.colorPrimitiveGold.opacity(0),
                            WWDesignTokens.colorPrimitiveGold.opacity(0.2),
                            WWDesignTokens.colorPrimitiveGold.opacity(0)
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: width * 0.6)
                    .offset(x: shimmerOffset * width)
                }
                .clipShape(RoundedRectangle(cornerRadius: WWDesignTokens.radiusBase))
                .allowsHitTesting(false)
            }
        }
        .overlay {
            if style == .secondary {
                RoundedRectangle(cornerRadius: WWDesignTokens.radiusBase)
                    .strokeBorder(WWTheme.primary, lineWidth: 1.5)
            }
        }
        .onAppear {
            guard !reduceMotion, hasShimmer else { return }
            withAnimation(
                .linear(duration: 2.0)
                .repeatForever(autoreverses: false)
            ) {
                shimmerOffset = 1.5
            }
        }
    }

    // MARK: - Style properties

    private var isFullWidth: Bool {
        switch style {
        case .primary, .secondary: true
        case .compact: false
        }
    }

    private var buttonHeight: CGFloat {
        switch style {
        case .primary, .secondary: 56 // h-14 = 3.5rem = 56pt
        case .compact: 44 // py-3 equivalent, min tap target
        }
    }

    private var horizontalPadding: CGFloat {
        switch style {
        case .primary, .secondary: WWDesignTokens.spacing8
        case .compact: WWDesignTokens.spacing12 // px-6 = 24pt
        }
    }

    private var hasBackground: Bool {
        style != .secondary
    }

    private var hasShimmer: Bool {
        style == .primary || style == .compact
    }

    private var backgroundColor: Color {
        switch style {
        case .primary, .compact: WWTheme.primary // Navy #1B2A4E
        case .secondary: .clear
        }
    }

    private var foregroundColor: Color {
        switch style {
        case .primary, .compact: WWDesignTokens.colorPrimitiveCream // #FAF6EF
        case .secondary: WWTheme.primary
        }
    }
}

#Preview {
    VStack(spacing: 16) {
        WWButton("Get Started") { }
        WWButton("Learn More", style: .secondary) { }
        WWButton("Add Trip", style: .compact) { }
        WWButton("Loading...", isLoading: true) { }
    }
    .padding()
    .background(WWTheme.background)
}

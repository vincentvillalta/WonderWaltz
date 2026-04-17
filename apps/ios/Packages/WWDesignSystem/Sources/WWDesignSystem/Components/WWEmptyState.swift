import SwiftUI

/// Empty state pattern matching React EmptyState.tsx.
/// Shows gradient icon container (navy/gold 10%), Fraunces title, muted description,
/// and optional compact navy CTA button.
///
/// Layout: centered VStack, full height.
/// Icon container: 96x96pt, rounded-3xl, gradient from navy/10% to gold/10%, icon gold at 48pt.
/// Title: Fraunces display (WWTypography.title), navy.
/// Description: Inter body, muted-foreground, max 320pt, relaxed line spacing.
/// CTA: WWButton with .compact style.
public struct WWEmptyState: View {

    private let icon: String
    private let title: String
    private let description: String
    private let actionLabel: String?
    private let action: (() -> Void)?

    @State private var iconScale: CGFloat = 0
    @State private var iconRotation: Double = -180
    @State private var contentOpacity: Double = 0
    @State private var contentOffset: CGFloat = 10
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// Create an empty state view.
    /// - Parameters:
    ///   - icon: SF Symbol name for the icon.
    ///   - title: Display title (shown in Fraunces).
    ///   - description: Explanatory body text.
    ///   - actionLabel: Optional CTA button label.
    ///   - action: Optional CTA action closure.
    public init(
        icon: String,
        title: String,
        description: String,
        actionLabel: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.icon = icon
        self.title = title
        self.description = description
        self.actionLabel = actionLabel
        self.action = action
    }

    public var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Icon container: 96x96, rounded-3xl, gradient bg
            ZStack {
                RoundedRectangle(cornerRadius: 24) // rounded-3xl
                    .fill(
                        LinearGradient(
                            colors: [
                                WWDesignTokens.colorPrimitiveNavy.opacity(0.1),
                                WWDesignTokens.colorPrimitiveGold.opacity(0.1)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 96, height: 96) // w-24 h-24

                Image(systemName: icon)
                    .font(.system(size: 48, weight: .light)) // w-12 = 48pt
                    .foregroundStyle(WWDesignTokens.colorPrimitiveGold)
            }
            .scaleEffect(iconScale)
            .rotationEffect(.degrees(iconRotation))
            .padding(.bottom, WWDesignTokens.spacing12) // mb-6 = 24pt

            // Title: Fraunces display
            Text(title)
                .font(WWTypography.title) // text-2xl Fraunces
                .foregroundStyle(WWTheme.primary)
                .multilineTextAlignment(.center)
                .opacity(contentOpacity)
                .offset(y: contentOffset)
                .padding(.bottom, WWDesignTokens.spacing3) // mb-3 = 6pt

            // Description: Inter body, muted
            Text(description)
                .font(WWTypography.body)
                .foregroundStyle(WWTheme.textSecondary)
                .multilineTextAlignment(.center)
                .lineSpacing(4) // leading-relaxed
                .frame(maxWidth: 320) // max-w-sm
                .opacity(contentOpacity)
                .offset(y: contentOffset)
                .padding(.bottom, WWDesignTokens.spacing16) // mb-8 = 32pt

            // CTA button (compact style)
            if let actionLabel, let action {
                WWButton(actionLabel, style: .compact, action: action)
                    .opacity(contentOpacity)
                    .offset(y: contentOffset)
            }

            Spacer()
        }
        .padding(.horizontal, WWDesignTokens.spacing16) // px-8 = 32pt
        .onAppear {
            if reduceMotion {
                iconScale = 1
                iconRotation = 0
                contentOpacity = 1
                contentOffset = 0
            } else {
                withAnimation(.spring(response: 0.5, dampingFraction: 0.7).delay(0.2)) {
                    iconScale = 1
                    iconRotation = 0
                }
                withAnimation(.easeOut(duration: 0.4).delay(0.3)) {
                    contentOpacity = 1
                    contentOffset = 0
                }
            }
        }
        .accessibilityElement(children: .combine)
    }
}

#Preview {
    WWEmptyState(
        icon: "sparkles",
        title: "No Plans Yet",
        description: "Create your first trip to get a personalized Walt Disney World itinerary.",
        actionLabel: "Create Trip",
        action: { }
    )
    .background(WWTheme.background)
}

import SwiftUI
import WWDesignSystem

/// Single onboarding slide matching Onboarding.tsx slide layout (lines 82-128):
/// - 96pt rounded-3xl icon container with gradient fill and white SF Symbol
/// - Fraunces display font title (text-4xl)
/// - Inter body description with relaxed line spacing, max-w-sm (320pt)
/// - Spring-in icon animation gated on reduce-motion
public struct OnboardingPageView: View {

    let page: OnboardingPage

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    public init(page: OnboardingPage) {
        self.page = page
    }

    public var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Icon with gradient background -- matches Onboarding.tsx lines 93-105
            // w-24 h-24 rounded-3xl bg-gradient-to-br shadow-lg
            RoundedRectangle(cornerRadius: 24)
                .fill(
                    LinearGradient(
                        colors: page.gradientColors,
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 96, height: 96)
                .shadow(color: .black.opacity(0.15), radius: 12, y: 4)
                .overlay {
                    Image(systemName: page.iconSystemName)
                        .font(.system(size: 48, weight: .regular))
                        .foregroundStyle(.white)
                }
                .padding(.bottom, 32)
                .transition(
                    reduceMotion
                        ? .opacity
                        : .scale.combined(with: .opacity)
                            .combined(with: .modifier(
                                active: RotationModifier(angle: -10),
                                identity: RotationModifier(angle: 0)
                            ))
                )
                .accessibilityHidden(true)

            // Title -- text-4xl, Fraunces display, navy
            // Matches Onboarding.tsx lines 108-116
            Text(LocalizedStringKey(page.titleKey))
                .font(WWTypography.largeTitle)
                .foregroundStyle(WWTheme.textPrimary)
                .multilineTextAlignment(.center)
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.bottom, 16)

            // Description -- text-lg text-muted-foreground max-w-sm leading-relaxed
            // Matches Onboarding.tsx lines 119-126
            Text(LocalizedStringKey(page.subtitleKey))
                .font(WWTypography.body)
                .foregroundStyle(WWTheme.textSecondary)
                .multilineTextAlignment(.center)
                .lineSpacing(6) // leading-relaxed equivalent
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: 320)

            Spacer()
        }
        .padding(.horizontal, 32)
    }
}

/// Rotation transition modifier for icon spring-in animation.
private struct RotationModifier: ViewModifier {
    let angle: Double

    func body(content: Content) -> some View {
        content.rotationEffect(.degrees(angle))
    }
}

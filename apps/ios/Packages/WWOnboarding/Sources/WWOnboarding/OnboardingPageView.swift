import SwiftUI
import WWDesignSystem

/// Reusable page template for onboarding screens.
/// Illustration area (top 60%), title + subtitle (bottom 40%).
/// Uses WWTypography for fonts, WWTheme for colors.
/// Supports Dynamic Type via `relativeTo:` font scaling.
public struct OnboardingPageView: View {

    /// The page data to display.
    let page: OnboardingPage

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    public init(page: OnboardingPage) {
        self.page = page
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Illustration area
                Spacer(minLength: 40)

                Image(systemName: page.systemImage)
                    .font(.system(size: illustrationSize))
                    .foregroundStyle(WWTheme.accent)
                    .accessibilityHidden(true)
                    .frame(maxHeight: .infinity)

                Spacer(minLength: 20)

                // Text area
                VStack(spacing: 12) {
                    Text(LocalizedStringKey(page.titleKey))
                        .font(WWTypography.title)
                        .foregroundStyle(WWTheme.textPrimary)
                        .multilineTextAlignment(.center)
                        .lineLimit(nil)
                        .fixedSize(horizontal: false, vertical: true)

                    Text(LocalizedStringKey(page.subtitleKey))
                        .font(WWTypography.body)
                        .foregroundStyle(WWTheme.textSecondary)
                        .multilineTextAlignment(.center)
                        .lineLimit(nil)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.horizontal, 32)
                }
                .padding(.bottom, 80)
            }
            .frame(maxWidth: .infinity, minHeight: UIScreen.main.bounds.height - 120)
        }
        .background(WWTheme.background)
    }

    /// Adjust illustration size for Dynamic Type accessibility sizes.
    private var illustrationSize: CGFloat {
        dynamicTypeSize.isAccessibilitySize ? 48 : 72
    }
}

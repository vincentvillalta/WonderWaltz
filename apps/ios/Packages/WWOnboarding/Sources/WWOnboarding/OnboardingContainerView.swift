import SwiftUI
import WWDesignSystem

/// Container view for the onboarding flow with swipeable pages.
/// Shows page indicator dots and Skip/Get Started buttons.
///
/// Per CONTEXT.md:
/// - No notification permission requested during onboarding (deferred to after plan generation).
/// - All strings use LocalizedStringKey for String Catalog (IOS-16).
public struct OnboardingContainerView: View {

    /// Called when onboarding completes (user taps "Get Started" or "Skip").
    private let onComplete: @MainActor () -> Void

    @State private var viewModel: OnboardingViewModel

    public init(onComplete: @escaping @MainActor () -> Void) {
        self.onComplete = onComplete
        _viewModel = State(initialValue: OnboardingViewModel(onComplete: onComplete))
    }

    public var body: some View {
        ZStack(alignment: .top) {
            // Paged content
            TabView(selection: $viewModel.currentPage) {
                ForEach(
                    Array(OnboardingViewModel.pages.enumerated()),
                    id: \.offset
                ) { index, page in
                    OnboardingPageView(page: page)
                        .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            // Skip button — top right
            HStack {
                Spacer()
                Button {
                    viewModel.skip()
                } label: {
                    Text("Skip", comment: "Skip onboarding button")
                        .font(WWTypography.subheadline)
                        .foregroundStyle(WWTheme.textSecondary)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                }
                .accessibilityLabel(Text("Skip onboarding",
                                         comment: "Skip onboarding accessibility label"))
            }
            .padding(.top, 8)
            .padding(.trailing, 8)

            // Bottom controls
            VStack {
                Spacer()

                // Page indicator dots
                HStack(spacing: 8) {
                    ForEach(0 ..< viewModel.totalPages, id: \.self) { index in
                        Circle()
                            .fill(index == viewModel.currentPage
                                  ? WWTheme.accent
                                  : WWTheme.muted)
                            .frame(width: 8, height: 8)
                            .animation(.easeInOut(duration: 0.2), value: viewModel.currentPage)
                    }
                }
                .padding(.bottom, 16)

                // Get Started / Next button
                Button {
                    withAnimation {
                        viewModel.advancePage()
                    }
                } label: {
                    Text(isLastPage
                         ? LocalizedStringKey("Get Started")
                         : LocalizedStringKey("Next"))
                        .font(WWTypography.button)
                        .foregroundStyle(WWTheme.textOnPrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(WWTheme.primary)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 32)
                .accessibilityLabel(Text(isLastPage
                                         ? "Get started"
                                         : "Next page",
                                         comment: "Onboarding action button"))
            }
        }
        .background(WWTheme.background)
    }

    private var isLastPage: Bool {
        viewModel.currentPage == viewModel.totalPages - 1
    }
}

import SwiftUI
import WWDesignSystem

/// Container view for the 4-slide onboarding flow matching Onboarding.tsx.
///
/// Layout (Onboarding.tsx lines 51-172):
/// - Cream background with two decorative gradient circles (pulsing, blur)
/// - Manual slide transitions with opacity + y-offset (AnimatePresence equivalent)
/// - Gold pagination dots: 32pt active, 8pt inactive (Capsule shapes)
/// - Navy CTA button via WWButton .primary (with chevron-right + shimmer)
/// - "Skip" text button below CTA on slides 0-2, hidden on slide 3
///
/// Per CONTEXT.md:
/// - No notification permission during onboarding (deferred to after plan generation).
/// - All strings use LocalizedStringKey for String Catalog (IOS-16).
public struct OnboardingContainerView: View {

    /// Called when onboarding completes (user taps "Get Started" or "Skip").
    private let onComplete: @MainActor () -> Void

    @State private var viewModel: OnboardingViewModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    // Decorative circle animation state
    @State private var topCirclePulsing = false
    @State private var bottomCirclePulsing = false

    public init(onComplete: @escaping @MainActor () -> Void) {
        self.onComplete = onComplete
        _viewModel = State(initialValue: OnboardingViewModel(onComplete: onComplete))
    }

    public var body: some View {
        ZStack {
            // Background -- bg-background (cream)
            WWTheme.background
                .ignoresSafeArea()

            // Decorative background elements -- Onboarding.tsx lines 53-78
            decorativeBackground

            // Main content
            VStack(spacing: 0) {
                // Slide content area -- flex-1, centered
                slideContent
                    .frame(maxWidth: .infinity, maxHeight: .infinity)

                // Bottom section -- p-8 space-y-6 (padding 32pt, gap 24pt)
                bottomControls
                    .padding(.horizontal, 32)
                    .padding(.bottom, 32)
            }
        }
        .onAppear {
            startDecorativeAnimations()
        }
    }

    // MARK: - Decorative Background

    /// Two gradient circles matching Onboarding.tsx lines 53-78.
    /// Top-right: 320pt gold at 10% opacity, blur(60), pulsing scale/opacity.
    /// Bottom-left: 384pt navy at 5% opacity, blur(60), slower pulsing.
    @ViewBuilder
    private var decorativeBackground: some View {
        // Top-right gold circle
        Circle()
            .fill(
                LinearGradient(
                    colors: [
                        WWDesignTokens.colorPrimitiveGold.opacity(0.1),
                        Color.clear
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .frame(width: 320, height: 320)
            .blur(radius: 60)
            .scaleEffect(topCirclePulsing ? 1.2 : 1.0)
            .opacity(topCirclePulsing ? 0.5 : 0.3)
            .position(x: UIScreen.main.bounds.width + 20, y: 100)
            .allowsHitTesting(false)

        // Bottom-left navy circle
        Circle()
            .fill(
                LinearGradient(
                    colors: [
                        WWDesignTokens.colorPrimitiveNavy.opacity(0.05),
                        Color.clear
                    ],
                    startPoint: .bottomTrailing,
                    endPoint: .topLeading
                )
            )
            .frame(width: 384, height: 384)
            .blur(radius: 60)
            .scaleEffect(bottomCirclePulsing ? 1.1 : 1.0)
            .opacity(bottomCirclePulsing ? 0.4 : 0.2)
            .position(x: -20, y: UIScreen.main.bounds.height + 20)
            .allowsHitTesting(false)
    }

    // MARK: - Slide Content

    /// Manual page switching with AnimatePresence-style transitions.
    /// Uses .id() + .transition() for opacity + y-offset slide changes.
    @ViewBuilder
    private var slideContent: some View {
        let page = OnboardingViewModel.pages[viewModel.currentPage]
        OnboardingPageView(page: page)
            .id(viewModel.currentPage)
            .transition(
                reduceMotion
                    ? .opacity
                    : .asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .leading).combined(with: .opacity)
                    )
            )
    }

    // MARK: - Bottom Controls

    /// Pagination dots, CTA button, and Skip button.
    /// Matches Onboarding.tsx lines 132-171.
    @ViewBuilder
    private var bottomControls: some View {
        VStack(spacing: 24) {
            // Pagination dots -- flex justify-center gap-2
            // Active: w-8 (32pt) h-2 (8pt) bg-gold Capsule
            // Inactive: w-2 (8pt) h-2 (8pt) bg-navy/20 Capsule
            HStack(spacing: 8) {
                ForEach(0 ..< viewModel.totalPages, id: \.self) { index in
                    Capsule()
                        .fill(
                            index == viewModel.currentPage
                                ? WWTheme.accent
                                : WWDesignTokens.colorPrimitiveNavy.opacity(0.2)
                        )
                        .frame(
                            width: index == viewModel.currentPage ? 32 : 8,
                            height: 8
                        )
                        .animation(
                            reduceMotion
                                ? .none
                                : .spring(response: 0.3, dampingFraction: 0.7),
                            value: viewModel.currentPage
                        )
                }
            }
            .accessibilityHidden(true)

            // CTA Button -- navy bg, gold shimmer, chevron-right
            // "Continue" on slides 0-2, "Get Started" on slide 3
            WWButton(
                isLastPage ? "Get Started" : "Continue",
                style: .primary
            ) {
                if reduceMotion {
                    viewModel.advancePage()
                } else {
                    withAnimation(.easeInOut(duration: 0.5)) {
                        viewModel.advancePage()
                    }
                }
            }
            .accessibilityLabel(Text(isLastPage ? "Get started" : "Continue to next page"))
            .accessibilityHint(Text("Page \(viewModel.currentPage + 1) of \(viewModel.totalPages)"))

            // Skip button -- visible on slides 0-2, hidden on slide 3
            // text-muted-foreground text-sm
            if !isLastPage {
                Button {
                    viewModel.skip()
                } label: {
                    Text("Skip", comment: "Skip onboarding button")
                        .font(WWTypography.subheadline)
                        .foregroundStyle(WWTheme.textSecondary)
                        .frame(minWidth: 44, minHeight: 44)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel(Text("Skip onboarding", comment: "Skip onboarding accessibility label"))
                .accessibilityAddTraits(.isButton)
            }
        }
    }

    // MARK: - Helpers

    private var isLastPage: Bool {
        viewModel.currentPage == viewModel.totalPages - 1
    }

    // MARK: - Lifecycle

    /// Start decorative circle pulsing animations on appear, gated on reduce-motion.
    private func startDecorativeAnimations() {
        guard !reduceMotion else { return }
        // Top circle: 8s cycle
        withAnimation(
            .easeInOut(duration: 8)
            .repeatForever(autoreverses: true)
        ) {
            topCirclePulsing = true
        }
        // Bottom circle: 10s cycle with 1s delay
        withAnimation(
            .easeInOut(duration: 10)
            .repeatForever(autoreverses: true)
            .delay(1)
        ) {
            bottomCirclePulsing = true
        }
    }
}

// MARK: - Preview

#Preview {
    OnboardingContainerView(onComplete: {})
}

import SwiftUI
import WWCore
import WWDesignSystem

/// Full-screen wizard container with 4-step flow matching React TripSetup.tsx.
/// Header: back button + "Step X of 4" + gold progress bar.
/// Content: navy gradient icon + Fraunces title + step form.
/// Footer: navy CTA "Continue" / "Generate Itinerary".
public struct WizardContainerView: View {

    @Bindable var viewModel: WizardViewModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(viewModel: WizardViewModel) {
        self.viewModel = viewModel
    }

    @AccessibilityFocusState private var focusedStepTitle: Bool

    public var body: some View {
        VStack(spacing: 0) {
            // Header: back button + step indicator
            header
                .padding(.horizontal, WWDesignTokens.spacing12)
                .padding(.top, WWDesignTokens.spacing12)
                .padding(.bottom, WWDesignTokens.spacing8)

            // Progress bar (h-1 = 4pt)
            progressBar
                .padding(.horizontal, WWDesignTokens.spacing12)

            // Scrollable step content
            ScrollView {
                stepContentWithHeader
                    .padding(.horizontal, WWDesignTokens.spacing12)
                    .padding(.bottom, WWDesignTokens.spacing12)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // Bottom CTA with border-t separator
            bottomCTA
        }
        .background(WWTheme.background)
        .animation(
            reduceMotion ? .none : .easeInOut(duration: 0.3),
            value: viewModel.currentStep
        )
        .onChange(of: viewModel.currentStep) { _, _ in
            focusedStepTitle = true
        }
    }

    // MARK: - Header (TripSetup.tsx lines 38-57)

    private var header: some View {
        HStack {
            // Back button: 40pt circle with muted bg, chevron.left
            if viewModel.canGoBack {
                Button {
                    Task { await viewModel.goBack() }
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(WWTheme.textPrimary)
                        .frame(width: 40, height: 40)
                        .background(WWTheme.muted)
                        .clipShape(Circle())
                }
                .accessibilityLabel(Text("Go back to previous step"))
            } else {
                // Spacer for layout balance
                Color.clear.frame(width: 40, height: 40)
            }

            Spacer()

            // "Step X of 4" in muted foreground
            Text("Step \(viewModel.currentStepNumber) of \(viewModel.totalSteps)")
                .font(WWTypography.subheadline)
                .foregroundStyle(WWTheme.textSecondary)

            Spacer()

            // Right spacer for balance
            Color.clear.frame(width: 40, height: 40)
        }
    }

    // MARK: - Progress Bar (TripSetup.tsx lines 59-67)

    private var progressBar: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                // Track: h-1 bg-muted rounded-full
                RoundedRectangle(cornerRadius: 2)
                    .fill(WWTheme.muted)
                    .frame(height: 4)

                // Fill: gold, animated
                RoundedRectangle(cornerRadius: 2)
                    .fill(WWTheme.accent)
                    .frame(
                        width: geometry.size.width * viewModel.progress,
                        height: 4
                    )
                    .animation(
                        reduceMotion ? .none : .easeInOut(duration: 0.3),
                        value: viewModel.progress
                    )
            }
        }
        .frame(height: 4)
        .accessibilityElement(children: .ignore)
        .accessibilityValue(Text("Step \(viewModel.currentStepNumber) of \(viewModel.totalSteps)"))
    }

    // MARK: - Step Content with Icon + Title Header (TripSetup.tsx lines 72-93)

    @ViewBuilder
    private var stepContentWithHeader: some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing12) {
            // Navy gradient icon (64pt, rounded-2xl)
            stepIconHeader

            // Step-specific form content
            stepContent
        }
        .id(viewModel.currentStep)
        .transition(reduceMotion
            ? .opacity
            : .asymmetric(
                insertion: .opacity.combined(with: .offset(x: 20)),
                removal: .opacity.combined(with: .offset(x: -20))
            )
        )
    }

    /// Navy gradient icon + Fraunces title + subtitle.
    /// Matches TripSetup.tsx lines 80-93.
    private var stepIconHeader: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Icon: 64pt container with navy gradient, gold SF Symbol at 32pt
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusBase)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.106, green: 0.165, blue: 0.306), // #1B2A4E
                            Color(red: 0.165, green: 0.227, blue: 0.369)  // #2A3A5E
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 64, height: 64)
                .overlay(
                    Image(systemName: viewModel.currentStep.systemImage)
                        .font(.system(size: 32, weight: .regular))
                        .foregroundStyle(WWTheme.accent)
                )
                .padding(.bottom, WWDesignTokens.spacing8)

            // Title: Fraunces 28pt (text-3xl equivalent)
            Text(viewModel.currentStep.title)
                .font(WWTypography.title)
                .foregroundStyle(WWTheme.textPrimary)
                .accessibilityAddTraits(.isHeader)
                .accessibilityFocused($focusedStepTitle)
                .padding(.bottom, WWDesignTokens.spacing2)

            // Subtitle: body, muted-foreground
            Text(viewModel.currentStep.subtitle)
                .font(WWTypography.body)
                .foregroundStyle(WWTheme.textSecondary)
        }
        .padding(.top, WWDesignTokens.spacing12)
    }

    // MARK: - Step Content Switch

    @ViewBuilder
    private var stepContent: some View {
        switch viewModel.currentStep {
        case .datesParty:
            DatesPartyStepView(viewModel: viewModel)
        case .resortTickets:
            ResortTicketsStepView(viewModel: viewModel)
        case .dining:
            DiningStepView(viewModel: viewModel)
        case .pacePriorities:
            PacePrioritiesStepView(viewModel: viewModel)
        }
    }

    // MARK: - Bottom CTA (TripSetup.tsx lines 571-583)

    private var bottomCTA: some View {
        VStack(spacing: 0) {
            // border-t separator
            Divider()
                .overlay(WWTheme.border)

            WWButton(
                viewModel.isOnLastStep
                    ? String(localized: "Generate Itinerary", comment: "Wizard final CTA")
                    : String(localized: "Continue", comment: "Wizard next step button"),
                isLoading: viewModel.isSubmitting
            ) {
                if viewModel.isOnLastStep {
                    Task { await viewModel.submitTrip() }
                } else {
                    Task { await viewModel.advanceStep() }
                }
            }
            .disabled(viewModel.isSubmitting)
            .accessibilityLabel(
                Text(viewModel.isOnLastStep
                     ? "Generate your personalized Disney itinerary"
                     : "Continue to next step")
            )
            .padding(WWDesignTokens.spacing12)
        }
    }
}

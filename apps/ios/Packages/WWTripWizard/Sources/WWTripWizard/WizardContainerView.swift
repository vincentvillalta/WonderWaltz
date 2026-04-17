import SwiftUI
import WWCore
import WWDesignSystem

/// Full-screen wizard container with progress bar and step navigation.
/// One question per screen per CONTEXT.md.
/// Uses WizardViewModel state to determine which step view to display.
public struct WizardContainerView: View {

    @Bindable var viewModel: WizardViewModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(viewModel: WizardViewModel) {
        self.viewModel = viewModel
    }

    @AccessibilityFocusState private var focusedStepTitle: Bool

    public var body: some View {
        VStack(spacing: 0) {
            // Progress bar at top
            progressHeader
                .padding(.horizontal, WWDesignTokens.spacing8)
                .padding(.top, WWDesignTokens.spacing4)

            // Step content
            stepContent
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .transition(reduceMotion
                    ? .opacity
                    : .asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .leading).combined(with: .opacity)
                    )
                )
                .id(viewModel.currentStep)

            // Bottom navigation
            bottomBar
                .padding(.horizontal, WWDesignTokens.spacing8)
                .padding(.bottom, WWDesignTokens.spacing8)
        }
        .background(WWTheme.background)
        .animation(
            reduceMotion ? .none : .easeInOut(duration: 0.3),
            value: viewModel.currentStep
        )
        .onChange(of: viewModel.currentStep) { _, _ in
            // Move VoiceOver focus to the new step's title after transition
            focusedStepTitle = true
        }
    }

    // MARK: - Progress Header

    private var progressHeader: some View {
        HStack {
            if viewModel.canGoBack {
                Button {
                    Task { await viewModel.goBack() }
                } label: {
                    HStack(spacing: WWDesignTokens.spacing2) {
                        Image(systemName: "chevron.left")
                            .font(.body.weight(.medium))
                        Text(LocalizedStringKey("Back"))
                            .font(WWTypography.subheadline)
                    }
                    .foregroundStyle(WWTheme.primary)
                    .frame(minWidth: WWDesignTokens.iconographyMinTapTarget,
                           minHeight: WWDesignTokens.iconographyMinTapTarget)
                    .contentShape(Rectangle())
                }
                .accessibilityLabel(Text("Go back to previous step"))
            } else {
                Spacer()
                    .frame(width: WWDesignTokens.iconographyMinTapTarget)
            }

            Spacer()
        }
        .overlay {
            WWProgressBar(
                progress: viewModel.progress,
                totalSteps: viewModel.totalSteps,
                currentStep: viewModel.currentStepNumber
            )
            .padding(.horizontal, WWDesignTokens.spacing20)
        }
    }

    // MARK: - Step Content

    @ViewBuilder
    private var stepContent: some View {
        switch viewModel.currentStep {
        case .dates:
            DatesStepView(viewModel: viewModel)
        case .parks:
            ParksStepView(viewModel: viewModel)
        case .guests:
            GuestsStepView(viewModel: viewModel)
        case .budget:
            BudgetStepView(viewModel: viewModel)
        case .lodging:
            LodgingStepView(viewModel: viewModel)
        case .mustDoRides:
            MustDoRidesStepView(viewModel: viewModel)
        case .mealPrefs:
            MealPrefsStepView(viewModel: viewModel)
        case .review:
            ReviewStepView(viewModel: viewModel)
        }
    }

    // MARK: - Bottom Bar

    private var bottomBar: some View {
        Group {
            if viewModel.isOnReviewStep {
                WWButton(
                    String(localized: "Generate My Plan", comment: "Wizard review CTA"),
                    isLoading: viewModel.isSubmitting
                ) {
                    Task { await viewModel.submitTrip() }
                }
                .disabled(viewModel.isSubmitting)
                .accessibilityLabel(Text("Generate your personalized Disney plan"))
            } else {
                WWButton(
                    String(localized: "Next", comment: "Wizard next step button")
                ) {
                    Task { await viewModel.advanceStep() }
                }
                .accessibilityLabel(Text("Continue to next step"))
            }
        }
    }
}

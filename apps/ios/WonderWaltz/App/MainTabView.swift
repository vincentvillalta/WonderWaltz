import SwiftUI
import WWCore
import WWDesignSystem
import WWTripWizard

/// Main tab view that shows either the wizard (if no trip exists) or placeholder plan view.
/// After plan generation completes, this will transition to the plan view (Plan 05).
struct MainTabView: View {

    @Environment(DependencyContainer.self) private var container

    @State private var viewModel: WizardViewModel?
    @State private var showWizard: Bool = false

    var body: some View {
        Group {
            if showWizard, let viewModel {
                WizardContainerView(viewModel: viewModel)
                    .onChange(of: viewModel.tripCreated) { _, created in
                        if created {
                            showWizard = false
                        }
                    }
            } else {
                startView
            }
        }
        .animation(.easeInOut(duration: 0.3), value: showWizard)
    }

    // MARK: - Start View

    private var startView: some View {
        VStack(spacing: WWDesignTokens.spacing8) {
            Spacer()

            Image(systemName: "sparkles")
                .font(.system(size: 48))
                .foregroundStyle(WWTheme.accent)
                .accessibilityHidden(true)

            Text(LocalizedStringKey("WonderWaltz"))
                .font(WWTypography.largeTitle)
                .foregroundStyle(WWTheme.textPrimary)

            Text(LocalizedStringKey("Your Disney adventure starts here"))
                .font(WWTypography.body)
                .foregroundStyle(WWTheme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, WWDesignTokens.spacing8)

            Spacer()

            WWButton(
                String(localized: "Start Planning", comment: "CTA to begin trip wizard")
            ) {
                let draftStore = container.wizardDraftStore as? any WizardDraftStoreProtocol
                let vm = WizardViewModel(
                    apiClient: container.apiClient,
                    draftStore: draftStore
                )
                viewModel = vm
                showWizard = true

                // Load any existing draft in the background.
                Task {
                    if let draft = await draftStore?.loadDraft() {
                        vm.restoreFromSnapshot(draft)
                    }
                }
            }
            .padding(.horizontal, WWDesignTokens.spacing8)
            .padding(.bottom, WWDesignTokens.spacing12)
            .accessibilityLabel(Text("Start planning your Disney trip"))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(WWTheme.background)
    }
}

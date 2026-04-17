import SwiftUI
import WWCore
import WWDesignSystem
import WWPlanView
import WWTripWizard

/// Main tab view that routes between: start screen, wizard, and plan view.
/// After `tripCreated` fires on the wizard VM, the app transitions to the plan view.
struct MainTabView: View {

    @Environment(DependencyContainer.self) private var container

    @State private var wizardVM: WizardViewModel?
    @State private var planVM: PlanViewModel?
    @State private var currentTripId: String?
    @State private var showWizard: Bool = false

    var body: some View {
        Group {
            if let tripId = currentTripId, let planVM {
                PlanContainerView(
                    viewModel: planVM,
                    planId: tripId,
                    onCreatePlan: {
                        self.currentTripId = nil
                        self.planVM = nil
                        self.startWizard()
                    }
                )
            } else if showWizard, let wizardVM {
                WizardContainerView(viewModel: wizardVM)
                    .onChange(of: wizardVM.tripCreated) { _, created in
                        if created, let tripId = wizardVM.generatedTripId {
                            showWizard = false
                            currentTripId = tripId
                            planVM = makePlanViewModel()
                        }
                    }
            } else {
                startView
            }
        }
        .animation(.easeInOut(duration: 0.3), value: showWizard)
        .animation(.easeInOut(duration: 0.3), value: currentTripId)
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
                startWizard()
            }
            .padding(.horizontal, WWDesignTokens.spacing8)
            .padding(.bottom, WWDesignTokens.spacing12)
            .accessibilityLabel(Text("Start planning your Disney trip"))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(WWTheme.background)
    }

    // MARK: - Helpers

    private func startWizard() {
        let draftStore = container.wizardDraftStore as? any WizardDraftStoreProtocol
        let vm = WizardViewModel(
            apiClient: container.apiClient,
            draftStore: draftStore
        )
        wizardVM = vm
        showWizard = true

        Task {
            if let draft = await draftStore?.loadDraft() {
                vm.restoreFromSnapshot(draft)
            }
        }
    }

    private func makePlanViewModel() -> PlanViewModel? {
        guard let offlineStore = container.offlineStore else { return nil }
        return PlanViewModel(
            apiClient: container.apiClient,
            offlineStore: offlineStore,
            analytics: container.analytics
        )
    }
}

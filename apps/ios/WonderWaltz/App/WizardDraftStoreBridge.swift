import WWOffline
import WWTripWizard

/// Bridges OfflineStore (actor in WWOffline) to WizardDraftStoreProtocol
/// (MainActor-isolated protocol in WWTripWizard). Lives in the app target
/// to avoid cross-package dependency between WWTripWizard and WWOffline.
@MainActor
final class WizardDraftStoreBridge: WizardDraftStoreProtocol {

    private let store: OfflineStore

    init(store: OfflineStore) {
        self.store = store
    }

    func saveDraft(_ snapshot: WizardDraftSnapshot) async throws {
        let data = WizardDraftData(
            startDate: snapshot.startDate,
            endDate: snapshot.endDate,
            selectedParkIds: snapshot.selectedParkIds,
            hasHopper: snapshot.hasHopper,
            guestsJSON: snapshot.guestsJSON,
            budgetTier: snapshot.budgetTier,
            lodgingType: snapshot.lodgingType,
            transportType: snapshot.transportType,
            mustDoRideIds: snapshot.mustDoRideIds,
            mealPreferences: snapshot.mealPreferences,
            currentStep: snapshot.currentStep,
            accommodationType: snapshot.accommodationType,
            selectedResort: snapshot.selectedResort,
            diningBudget: snapshot.diningBudget,
            characterDining: snapshot.characterDining,
            wantDiningSuggestions: snapshot.wantDiningSuggestions,
            reservationsJSON: snapshot.reservationsJSON,
            paceValue: snapshot.paceValue
        )
        try await store.saveWizardDraft(data)
    }

    func loadDraft() async -> WizardDraftSnapshot? {
        guard let data = await store.loadWizardDraft() else { return nil }
        return WizardDraftSnapshot(
            startDate: data.startDate,
            endDate: data.endDate,
            selectedParkIds: data.selectedParkIds,
            hasHopper: data.hasHopper,
            guestsJSON: data.guestsJSON,
            budgetTier: data.budgetTier,
            lodgingType: data.lodgingType,
            transportType: data.transportType,
            mustDoRideIds: data.mustDoRideIds,
            mealPreferences: data.mealPreferences,
            currentStep: data.currentStep,
            accommodationType: data.accommodationType,
            selectedResort: data.selectedResort,
            diningBudget: data.diningBudget,
            characterDining: data.characterDining,
            wantDiningSuggestions: data.wantDiningSuggestions,
            reservationsJSON: data.reservationsJSON,
            paceValue: data.paceValue
        )
    }
}

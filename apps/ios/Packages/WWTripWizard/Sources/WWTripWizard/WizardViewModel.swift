import Foundation
import Observation
import WWCore

// MARK: - WizardStep Enum

/// The 8 wizard steps in order per IOS-06.
public enum WizardStep: Int, CaseIterable, Sendable, Equatable {
    case dates = 0
    case parks = 1
    case guests = 2
    case budget = 3
    case lodging = 4
    case mustDoRides = 5
    case mealPrefs = 6
    case review = 7
}

// MARK: - GuestInput

/// Represents a single guest in the wizard.
/// Age stored as bracket string per LEGL-07 -- never birthdate.
public struct GuestInput: Codable, Sendable, Equatable, Identifiable {
    public var id: UUID
    public var name: String
    public var ageBracket: String
    public var hasDAS: Bool
    public var mobilityNeeds: [String]
    public var sensoryNeeds: [String]
    public var dietaryRestrictions: [String]

    public init(
        id: UUID = UUID(),
        name: String = "",
        ageBracket: String = "18+",
        hasDAS: Bool = false,
        mobilityNeeds: [String] = [],
        sensoryNeeds: [String] = [],
        dietaryRestrictions: [String] = []
    ) {
        self.id = id
        self.name = name
        self.ageBracket = ageBracket
        self.hasDAS = hasDAS
        self.mobilityNeeds = mobilityNeeds
        self.sensoryNeeds = sensoryNeeds
        self.dietaryRestrictions = dietaryRestrictions
    }
}

// MARK: - WizardDraftSnapshot

/// Sendable snapshot of wizard state for persistence.
/// Mirrors WizardDraftData in WWOffline but defined here to avoid
/// cross-package dependency (WWTripWizard depends on WWCore only).
public struct WizardDraftSnapshot: Sendable, Equatable {
    public var startDate: Date?
    public var endDate: Date?
    public var selectedParkIds: [String]
    public var hasHopper: Bool
    public var guestsJSON: String
    public var budgetTier: String?
    public var lodgingType: String?
    public var transportType: String?
    public var mustDoRideIds: [String]
    public var mealPreferences: [String]
    public var currentStep: Int

    public init(
        startDate: Date? = nil,
        endDate: Date? = nil,
        selectedParkIds: [String] = [],
        hasHopper: Bool = false,
        guestsJSON: String = "[]",
        budgetTier: String? = nil,
        lodgingType: String? = nil,
        transportType: String? = nil,
        mustDoRideIds: [String] = [],
        mealPreferences: [String] = [],
        currentStep: Int = 0
    ) {
        self.startDate = startDate
        self.endDate = endDate
        self.selectedParkIds = selectedParkIds
        self.hasHopper = hasHopper
        self.guestsJSON = guestsJSON
        self.budgetTier = budgetTier
        self.lodgingType = lodgingType
        self.transportType = transportType
        self.mustDoRideIds = mustDoRideIds
        self.mealPreferences = mealPreferences
        self.currentStep = currentStep
    }
}

// MARK: - WizardDraftStore Protocol

/// Protocol for wizard draft persistence.
/// Concrete OfflineStore in WWOffline conforms via extension in the app target.
@MainActor
public protocol WizardDraftStoreProtocol: Sendable {
    func saveDraft(_ snapshot: WizardDraftSnapshot) async throws
    func loadDraft() async -> WizardDraftSnapshot?
}

// MARK: - WizardViewModel

/// Manages all wizard state with auto-save via WizardDraftStoreProtocol.
/// @Observable @MainActor for SwiftUI binding.
@Observable
@MainActor
public final class WizardViewModel {

    // MARK: - Current Step

    public var currentStep: WizardStep = .dates

    // MARK: - Step Data

    // Step 0: Dates
    public var startDate: Date = Calendar.current.date(byAdding: .day, value: 14, to: .now) ?? .now
    public var endDate: Date = Calendar.current.date(byAdding: .day, value: 17, to: .now) ?? .now

    // Step 1: Parks
    public var selectedParkIds: [String] = []
    public var hasHopper: Bool = false

    // Step 2: Guests
    public var guests: [GuestInput] = [GuestInput()]

    // Step 3: Budget
    public var budgetTier: String?

    // Step 4: Lodging
    public var lodgingType: String?
    public var transportType: String?

    // Step 5: Must-do rides
    public var mustDoRideIds: [String] = []

    // Step 6: Meal preferences
    public var mealPreferences: [String] = []

    // MARK: - Submission State

    public var isSubmitting: Bool = false
    public var submissionError: String?
    public var tripCreated: Bool = false

    // MARK: - Dependencies

    private let apiClient: any APIClientProtocol
    private let draftStore: (any WizardDraftStoreProtocol)?

    // MARK: - Init

    public init(
        apiClient: any APIClientProtocol,
        draftStore: (any WizardDraftStoreProtocol)? = nil,
        draft: WizardDraftSnapshot? = nil
    ) {
        self.apiClient = apiClient
        self.draftStore = draftStore

        if let draft {
            restoreFromDraft(draft)
        }
    }

    // MARK: - Navigation

    /// Advance to the next step, saving draft along the way.
    public func advanceStep() async {
        guard let nextStep = WizardStep(rawValue: currentStep.rawValue + 1) else { return }
        await saveCurrentStep()
        currentStep = nextStep
    }

    /// Go back to the previous step, saving draft along the way.
    public func goBack() async {
        guard let prevStep = WizardStep(rawValue: currentStep.rawValue - 1) else { return }
        await saveCurrentStep()
        currentStep = prevStep
    }

    /// Whether the user can go back from the current step.
    public var canGoBack: Bool {
        currentStep.rawValue > 0
    }

    /// Whether the current step is the review step.
    public var isOnReviewStep: Bool {
        currentStep == .review
    }

    /// Total number of steps.
    public var totalSteps: Int {
        WizardStep.allCases.count
    }

    /// Current step number (1-indexed for display).
    public var currentStepNumber: Int {
        currentStep.rawValue + 1
    }

    /// Progress value (0-1) for the progress bar.
    public var progress: Double {
        Double(currentStep.rawValue) / Double(totalSteps - 1)
    }

    // MARK: - Auto-Save

    /// Save current wizard state as a draft.
    public func saveCurrentStep() async {
        let snapshot = buildSnapshot()
        do {
            try await draftStore?.saveDraft(snapshot)
        } catch {
            // Best-effort save -- don't block user flow
        }
    }

    // MARK: - Trip Submission

    /// Submit the trip: create via API, then trigger plan generation.
    public func submitTrip() async {
        isSubmitting = true
        submissionError = nil

        do {
            let tripBody = try buildTripBody()
            let tripData = try await apiClient.createTrip(tripBody)

            // Parse trip ID from response
            guard let tripId = parseTripId(from: tripData) else {
                submissionError = String(
                    localized: "Could not read trip details. Please try again.",
                    comment: "Wizard submission error: trip ID parse failure"
                )
                isSubmitting = false
                return
            }

            // Trigger plan generation
            _ = try await apiClient.generatePlan(tripId: tripId)

            tripCreated = true
            isSubmitting = false
        } catch {
            submissionError = String(
                localized: "Something went wrong creating your trip. Please check your connection and try again.",
                comment: "Wizard submission error: network or server failure"
            )
            isSubmitting = false
        }
    }

    // MARK: - Private Helpers

    private func restoreFromDraft(_ draft: WizardDraftSnapshot) {
        if let start = draft.startDate { startDate = start }
        if let end = draft.endDate { endDate = end }
        selectedParkIds = draft.selectedParkIds
        hasHopper = draft.hasHopper
        if let tier = draft.budgetTier { budgetTier = tier }
        if let lodging = draft.lodgingType { lodgingType = lodging }
        if let transport = draft.transportType { transportType = transport }
        mustDoRideIds = draft.mustDoRideIds
        mealPreferences = draft.mealPreferences

        // Restore guests from JSON
        if let data = draft.guestsJSON.data(using: .utf8),
           let decoded = try? JSONDecoder().decode([GuestInput].self, from: data),
           !decoded.isEmpty {
            guests = decoded
        }

        // Restore step position
        if let step = WizardStep(rawValue: draft.currentStep) {
            currentStep = step
        }
    }

    func buildSnapshot() -> WizardDraftSnapshot {
        let guestsData = (try? JSONEncoder().encode(guests)) ?? Data()
        let guestsJSON = String(data: guestsData, encoding: .utf8) ?? "[]"

        return WizardDraftSnapshot(
            startDate: startDate,
            endDate: endDate,
            selectedParkIds: selectedParkIds,
            hasHopper: hasHopper,
            guestsJSON: guestsJSON,
            budgetTier: budgetTier,
            lodgingType: lodgingType,
            transportType: transportType,
            mustDoRideIds: mustDoRideIds,
            mealPreferences: mealPreferences,
            currentStep: currentStep.rawValue
        )
    }

    private func buildTripBody() throws -> Data {
        let body: [String: Any] = [
            "startDate": ISO8601DateFormatter().string(from: startDate),
            "endDate": ISO8601DateFormatter().string(from: endDate),
            "parkIds": selectedParkIds,
            "hasHopper": hasHopper,
            "guests": guests.map { guest in
                [
                    "name": guest.name,
                    "ageBracket": guest.ageBracket,
                    "hasDAS": guest.hasDAS,
                    "mobilityNeeds": guest.mobilityNeeds,
                    "sensoryNeeds": guest.sensoryNeeds,
                    "dietaryRestrictions": guest.dietaryRestrictions
                ] as [String: Any]
            },
            "budgetTier": budgetTier ?? "moderate",
            "lodgingType": lodgingType ?? "off-property",
            "transportType": transportType ?? "car",
            "mustDoAttractionIds": mustDoRideIds,
            "mealPreferences": mealPreferences
        ]
        return try JSONSerialization.data(withJSONObject: body)
    }

    private func parseTripId(from data: Data) -> String? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let dataObj = json["data"] as? [String: Any],
              let id = dataObj["id"] as? String else {
            return nil
        }
        return id
    }
}

import Foundation
import Observation
import WWCore

// MARK: - WizardStep Enum

/// The 4 wizard steps matching React TripSetup.tsx design.
/// Restructured from 8 steps to 4 combined steps for a faster, friendlier experience.
public enum WizardStep: Int, CaseIterable, Sendable, Equatable {
    case datesParty = 0       // "Dates & Party"
    case resortTickets = 1    // "Resort & Tickets"
    case dining = 2           // "Dining ADRs"
    case pacePriorities = 3   // "Pace & Priorities"

    /// Display title per TripSetup.tsx steps array.
    public var title: String {
        switch self {
        case .datesParty: "Dates & Party"
        case .resortTickets: "Resort & Tickets"
        case .dining: "Dining ADRs"
        case .pacePriorities: "Pace & Priorities"
        }
    }

    /// Subtitle per TripSetup.tsx lines 88-91.
    public var subtitle: String {
        switch self {
        case .datesParty: "Let's start with the basics of your trip"
        case .resortTickets: "Where are you staying and which parks?"
        case .dining: "Add any dining reservations you've made"
        case .pacePriorities: "How would you like to experience the parks?"
        }
    }

    /// SF Symbol matching React Lucide icons.
    public var systemImage: String {
        switch self {
        case .datesParty: "calendar"
        case .resortTickets: "person.2"
        case .dining: "fork.knife"
        case .pacePriorities: "gauge.medium"
        }
    }
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
    /// Height in inches (for ride requirements). Optional for adults.
    public var heightInches: Int?

    public init(
        id: UUID = UUID(),
        name: String = "",
        ageBracket: String = "18+",
        hasDAS: Bool = false,
        mobilityNeeds: [String] = [],
        sensoryNeeds: [String] = [],
        dietaryRestrictions: [String] = [],
        heightInches: Int? = nil
    ) {
        self.id = id
        self.name = name
        self.ageBracket = ageBracket
        self.hasDAS = hasDAS
        self.mobilityNeeds = mobilityNeeds
        self.sensoryNeeds = sensoryNeeds
        self.dietaryRestrictions = dietaryRestrictions
        self.heightInches = heightInches
    }

    /// Whether this guest is a child (age bracket is NOT "18+").
    public var isChild: Bool {
        ageBracket != "18+"
    }
}

// MARK: - Dining Types

/// Dining budget preference matching TripSetup.tsx $, $$, $$$ options.
public enum DiningBudget: String, Codable, Sendable, CaseIterable {
    case budget
    case moderate
    case premium

    public var displaySymbol: String {
        switch self {
        case .budget: "$"
        case .moderate: "$$"
        case .premium: "$$$"
        }
    }

    public var displayLabel: String {
        switch self {
        case .budget: "Budget"
        case .moderate: "Moderate"
        case .premium: "Premium"
        }
    }
}

/// Character dining preference matching TripSetup.tsx radio options.
public enum CharacterDiningPref: String, Codable, Sendable, CaseIterable {
    case must
    case nice
    case skip

    public var displayTitle: String {
        switch self {
        case .must: "Must have"
        case .nice: "Nice to have"
        case .skip: "Not interested"
        }
    }

    public var displaySubtitle: String {
        switch self {
        case .must: "Character meals are a priority"
        case .nice: "Include if available"
        case .skip: "Skip character dining"
        }
    }
}

/// A dining reservation entered by the user.
public struct DiningReservation: Codable, Sendable, Equatable, Identifiable {
    public var id: UUID
    public var restaurantName: String
    public var parkName: String
    public var date: Date
    public var time: String

    public init(
        id: UUID = UUID(),
        restaurantName: String = "",
        parkName: String = "",
        date: Date = .now,
        time: String = ""
    ) {
        self.id = id
        self.restaurantName = restaurantName
        self.parkName = parkName
        self.date = date
        self.time = time
    }
}

// MARK: - Accommodation Type

/// Accommodation type matching TripSetup.tsx radio options.
public enum AccommodationType: String, Codable, Sendable, CaseIterable {
    case disneyResort = "onsite"
    case offProperty = "offsite"
    case notSureYet = "undecided"

    public var displayTitle: String {
        switch self {
        case .disneyResort: "Disney Resort"
        case .offProperty: "Off-Property"
        case .notSureYet: "Not Sure Yet"
        }
    }

    public var displaySubtitle: String {
        switch self {
        case .disneyResort: "Staying on property"
        case .offProperty: "Hotel or vacation rental"
        case .notSureYet: "Still deciding"
        }
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
    // New fields for 4-step wizard
    public var accommodationType: String?
    public var selectedResort: String?
    public var diningBudget: String?
    public var characterDining: String?
    public var wantDiningSuggestions: Bool
    public var reservationsJSON: String
    public var paceValue: Double

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
        currentStep: Int = 0,
        accommodationType: String? = nil,
        selectedResort: String? = nil,
        diningBudget: String? = nil,
        characterDining: String? = nil,
        wantDiningSuggestions: Bool = true,
        reservationsJSON: String = "[]",
        paceValue: Double = 60.0
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
        self.accommodationType = accommodationType
        self.selectedResort = selectedResort
        self.diningBudget = diningBudget
        self.characterDining = characterDining
        self.wantDiningSuggestions = wantDiningSuggestions
        self.reservationsJSON = reservationsJSON
        self.paceValue = paceValue
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
/// Restructured for 4-step wizard matching React TripSetup.tsx.
@Observable
@MainActor
public final class WizardViewModel {

    // MARK: - Current Step

    public var currentStep: WizardStep = .datesParty

    // MARK: - Step 1: Dates & Party

    public var startDate: Date = Calendar.current.date(byAdding: .day, value: 14, to: .now) ?? .now
    public var endDate: Date = Calendar.current.date(byAdding: .day, value: 17, to: .now) ?? .now
    public var guests: [GuestInput] = [GuestInput()]

    // MARK: - Step 2: Resort & Tickets

    public var accommodationType: AccommodationType = .disneyResort
    public var selectedResort: String?
    public var selectedParkIds: [String] = []
    public var hasHopper: Bool = false

    // Legacy aliases for backward compat
    public var lodgingType: String? {
        get { accommodationType.rawValue }
        set {
            if let newValue, let type = AccommodationType(rawValue: newValue) {
                accommodationType = type
            }
        }
    }
    public var transportType: String?

    // MARK: - Step 3: Dining ADRs

    public var wantDiningSuggestions: Bool = true
    public var diningBudget: DiningBudget = .moderate
    public var characterDining: CharacterDiningPref = .must
    public var existingReservations: [DiningReservation] = []

    // Legacy alias
    public var budgetTier: String? {
        get { diningBudget.rawValue }
        set {
            if let newValue, let budget = DiningBudget(rawValue: newValue) {
                diningBudget = budget
            }
        }
    }
    public var mealPreferences: [String] = []

    // MARK: - Step 4: Pace & Priorities

    public var paceValue: Double = 60.0
    public var mustDoRideIds: [String] = []

    // MARK: - Submission State

    public var isSubmitting: Bool = false
    public var submissionError: String?
    public var tripCreated: Bool = false
    /// The trip ID returned by the API after successful submission.
    /// Consumed by the app target to navigate to the plan view.
    public var generatedTripId: String?

    // MARK: - Dependencies

    private let apiClient: any APIClientProtocol
    private let authService: (any AuthServiceProtocol)?
    private let draftStore: (any WizardDraftStoreProtocol)?

    // MARK: - Init

    public init(
        apiClient: any APIClientProtocol,
        authService: (any AuthServiceProtocol)? = nil,
        draftStore: (any WizardDraftStoreProtocol)? = nil,
        draft: WizardDraftSnapshot? = nil
    ) {
        self.apiClient = apiClient
        self.authService = authService
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

    /// Whether the current step is the last step.
    public var isOnLastStep: Bool {
        currentStep == .pacePriorities
    }

    /// Total number of steps (always 4).
    public var totalSteps: Int { 4 }

    /// Current step number (1-indexed for display).
    public var currentStepNumber: Int {
        currentStep.rawValue + 1
    }

    /// Progress value (0-1) for the progress bar.
    /// Step 0 = 25%, Step 1 = 50%, Step 2 = 75%, Step 3 = 100%.
    public var progress: Double {
        Double(currentStep.rawValue + 1) / Double(totalSteps)
    }

    // MARK: - Auto-Save

    /// Save current wizard state as a draft.
    public func saveCurrentStep() async {
        let snapshot = buildSnapshot()
        do {
            try await draftStore?.saveDraft(snapshot)
            WWLogger.wizard.trace("draft saved at step=\(self.currentStep.rawValue)")
        } catch {
            // Best-effort save -- don't block user flow
            WWLogger.wizard.error("draft save failed: \(error.localizedDescription, privacy: .public)")
        }
    }

    // MARK: - Trip Submission

    /// Submit the trip: create via API, then trigger plan generation.
    public func submitTrip() async {
        WWLogger.wizard.debug("submitTrip start (step=\(self.currentStep.rawValue))")
        isSubmitting = true
        submissionError = nil

        // Ensure we have an auth token before submitting. If auth is pending
        // (e.g. splash-time silent auth failed or never ran), try once more.
        if let authService, authService.getToken() == nil {
            WWLogger.wizard.debug("submitTrip: no token, attempting silent auth")
            await authService.silentAuth()
            if authService.getToken() == nil {
                WWLogger.wizard.error("submitTrip: silent auth failed — cannot submit")
                submissionError = String(
                    localized: "Can't connect to WonderWaltz. Please check your internet connection and try again.",
                    comment: "Wizard submission error: auth required"
                )
                isSubmitting = false
                return
            }
        }

        do {
            let tripBody = try buildTripBody()
            WWLogger.wizard.trace("submitTrip: built body (\(tripBody.count)B)")
            let tripData = try await apiClient.createTrip(tripBody)

            // Parse trip ID from response
            guard let tripId = parseTripId(from: tripData) else {
                WWLogger.wizard.error("submitTrip: could not parse trip ID from createTrip response")
                submissionError = String(
                    localized: "Could not read trip details. Please try again.",
                    comment: "Wizard submission error: trip ID parse failure"
                )
                isSubmitting = false
                return
            }
            WWLogger.wizard.debug("submitTrip: trip created, id=\(tripId, privacy: .public)")

            // Trigger plan generation
            _ = try await apiClient.generatePlan(tripId: tripId)
            WWLogger.wizard.debug("submitTrip: plan generation enqueued for \(tripId, privacy: .public)")

            generatedTripId = tripId
            tripCreated = true
            isSubmitting = false
        } catch {
            WWLogger.wizard.error("submitTrip failed: \(error.localizedDescription, privacy: .public)")
            submissionError = String(
                localized: "Something went wrong creating your trip. Please check your connection and try again.",
                comment: "Wizard submission error: network or server failure"
            )
            isSubmitting = false
        }
    }

    // MARK: - Private Helpers

    /// Restore wizard state from a persisted draft snapshot.
    /// Called by the app target after loading the draft from disk.
    public func restoreFromSnapshot(_ draft: WizardDraftSnapshot) {
        restoreFromDraft(draft)
    }

    private func restoreFromDraft(_ draft: WizardDraftSnapshot) {
        if let start = draft.startDate { startDate = start }
        if let end = draft.endDate { endDate = end }
        selectedParkIds = draft.selectedParkIds
        hasHopper = draft.hasHopper
        if let lodging = draft.lodgingType, let type = AccommodationType(rawValue: lodging) {
            accommodationType = type
        }
        if let accom = draft.accommodationType, let type = AccommodationType(rawValue: accom) {
            accommodationType = type
        }
        selectedResort = draft.selectedResort
        transportType = draft.transportType
        mustDoRideIds = draft.mustDoRideIds
        mealPreferences = draft.mealPreferences
        paceValue = draft.paceValue

        // Restore dining
        if let db = draft.diningBudget, let budget = DiningBudget(rawValue: db) {
            diningBudget = budget
        } else if let tier = draft.budgetTier, let budget = DiningBudget(rawValue: tier) {
            diningBudget = budget
        }
        if let cd = draft.characterDining, let pref = CharacterDiningPref(rawValue: cd) {
            characterDining = pref
        }
        wantDiningSuggestions = draft.wantDiningSuggestions

        // Restore reservations from JSON
        if let data = draft.reservationsJSON.data(using: .utf8),
           let decoded = try? JSONDecoder().decode([DiningReservation].self, from: data),
           !decoded.isEmpty {
            existingReservations = decoded
        }

        // Restore guests from JSON
        if let data = draft.guestsJSON.data(using: .utf8),
           let decoded = try? JSONDecoder().decode([GuestInput].self, from: data),
           !decoded.isEmpty {
            guests = decoded
        }

        // Restore step position (map old 8-step values to 4-step)
        if let step = WizardStep(rawValue: min(draft.currentStep, 3)) {
            currentStep = step
        }
    }

    func buildSnapshot() -> WizardDraftSnapshot {
        let guestsData = (try? JSONEncoder().encode(guests)) ?? Data()
        let guestsJSON = String(data: guestsData, encoding: .utf8) ?? "[]"
        let reservationsData = (try? JSONEncoder().encode(existingReservations)) ?? Data()
        let reservationsJSON = String(data: reservationsData, encoding: .utf8) ?? "[]"

        return WizardDraftSnapshot(
            startDate: startDate,
            endDate: endDate,
            selectedParkIds: selectedParkIds,
            hasHopper: hasHopper,
            guestsJSON: guestsJSON,
            budgetTier: diningBudget.rawValue,
            lodgingType: accommodationType.rawValue,
            transportType: transportType,
            mustDoRideIds: mustDoRideIds,
            mealPreferences: mealPreferences,
            currentStep: currentStep.rawValue,
            accommodationType: accommodationType.rawValue,
            selectedResort: selectedResort,
            diningBudget: diningBudget.rawValue,
            characterDining: characterDining.rawValue,
            wantDiningSuggestions: wantDiningSuggestions,
            reservationsJSON: reservationsJSON,
            paceValue: paceValue
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
            "budgetTier": diningBudget.rawValue,
            "lodgingType": accommodationType.rawValue,
            "transportType": transportType ?? "car",
            "mustDoAttractionIds": mustDoRideIds,
            "mealPreferences": mealPreferences,
            "paceValue": paceValue,
            "wantDiningSuggestions": wantDiningSuggestions,
            "characterDining": characterDining.rawValue
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

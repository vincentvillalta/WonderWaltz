import Foundation
import SwiftData

/// Persisted wizard draft for auto-save.
/// Each wizard step updates this model so the user can resume where they left off.
@Model
public final class WizardDraft {
    /// Trip start date (Step 0: dates).
    public var startDate: Date?

    /// Trip end date (Step 0: dates).
    public var endDate: Date?

    /// Selected park IDs (Step 1: parks).
    public var selectedParkIds: [String]

    /// Whether park hopper is enabled (Step 1: parks).
    public var hasHopper: Bool

    /// Serialized guest array as JSON string to avoid nested @Model complexity.
    public var guestsJSON: String

    /// Budget tier selection (Step 3: budget).
    public var budgetTier: String?

    /// Lodging type (Step 4: lodging).
    public var lodgingType: String?

    /// Transport type (Step 5: transport).
    public var transportType: String?

    /// Must-do ride IDs (Step 6: must-dos).
    public var mustDoRideIds: [String]

    /// Meal preferences (Step 7: meals).
    public var mealPreferences: [String]

    /// Current wizard step (0-3) for resume.
    public var currentStep: Int

    /// Accommodation type: onsite, offsite, undecided (Step 2: Resort & Tickets).
    public var accommodationType: String?

    /// Selected Disney resort name (Step 2: Resort & Tickets).
    public var selectedResort: String?

    /// Dining budget: budget, moderate, premium (Step 3: Dining ADRs).
    public var diningBudget: String?

    /// Character dining preference: must, nice, skip (Step 3: Dining ADRs).
    public var characterDining: String?

    /// Whether user wants dining suggestions (Step 3: Dining ADRs).
    public var wantDiningSuggestions: Bool

    /// Serialized dining reservations as JSON string (Step 3: Dining ADRs).
    public var reservationsJSON: String

    /// Pace slider value 0-120 (Step 4: Pace & Priorities).
    public var paceValue: Double

    /// When this draft was created.
    public var createdAt: Date

    /// When this draft was last updated.
    public var updatedAt: Date

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
        paceValue: Double = 60.0,
        createdAt: Date = .now,
        updatedAt: Date = .now
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
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

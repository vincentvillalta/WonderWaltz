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

    /// Current wizard step (0-7) for resume.
    public var currentStep: Int

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
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

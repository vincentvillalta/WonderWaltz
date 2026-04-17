import Foundation
import SwiftData

/// Persisted plan day for offline access.
@Model
public final class CachedPlanDay {
    /// Server day ID.
    @Attribute(.unique)
    public var id: String

    /// Day number within the plan (1-based).
    public var dayNumber: Int

    /// Calendar date for this day.
    public var date: Date

    /// Park ID for this day.
    public var parkId: String

    /// Display name of the park.
    public var parkName: String

    /// Narrative intro text for this day.
    public var narrativeIntro: String?

    /// Narrative tip text for this day.
    public var narrativeTip: String?

    /// Whether this day is locked (true for Days 2+ on free tier).
    public var isLocked: Bool

    /// Items scheduled for this day, cascading on delete.
    @Relationship(deleteRule: .cascade, inverse: \CachedPlanItem.day)
    public var items: [CachedPlanItem]

    /// Parent plan relationship.
    public var plan: CachedPlan?

    public init(
        id: String,
        dayNumber: Int,
        date: Date,
        parkId: String,
        parkName: String,
        narrativeIntro: String? = nil,
        narrativeTip: String? = nil,
        isLocked: Bool = false
    ) {
        self.id = id
        self.dayNumber = dayNumber
        self.date = date
        self.parkId = parkId
        self.parkName = parkName
        self.narrativeIntro = narrativeIntro
        self.narrativeTip = narrativeTip
        self.isLocked = isLocked
        self.items = []
    }
}

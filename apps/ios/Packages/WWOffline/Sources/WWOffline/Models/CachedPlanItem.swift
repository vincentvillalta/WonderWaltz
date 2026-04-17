import Foundation
import SwiftData

/// Persisted plan item (attraction, meal, show, etc.) for offline access.
@Model
public final class CachedPlanItem {
    /// Server item ID.
    @Attribute(.unique)
    public var id: String

    /// Item type: attraction, meal, show, ll_reminder, rest, walk.
    public var type: String

    /// Reference ID to catalog attraction/dining (if applicable).
    public var refId: String?

    /// Display name.
    public var name: String

    /// Scheduled start time (e.g. "09:15").
    public var startTime: String

    /// Scheduled end time (e.g. "09:45").
    public var endTime: String

    /// Estimated wait in minutes (attractions only).
    public var waitMinutes: Int?

    /// Walk time in minutes to reach this item.
    public var walkMinutes: Int?

    /// Narrative tip for this item.
    public var narrativeTip: String?

    /// Sort order within the day.
    public var sortOrder: Int

    /// Parent day relationship.
    public var day: CachedPlanDay?

    public init(
        id: String,
        type: String,
        refId: String? = nil,
        name: String,
        startTime: String,
        endTime: String,
        waitMinutes: Int? = nil,
        walkMinutes: Int? = nil,
        narrativeTip: String? = nil,
        sortOrder: Int
    ) {
        self.id = id
        self.type = type
        self.refId = refId
        self.name = name
        self.startTime = startTime
        self.endTime = endTime
        self.waitMinutes = waitMinutes
        self.walkMinutes = walkMinutes
        self.narrativeTip = narrativeTip
        self.sortOrder = sortOrder
    }
}

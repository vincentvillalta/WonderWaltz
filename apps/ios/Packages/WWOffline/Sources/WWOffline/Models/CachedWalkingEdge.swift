import Foundation
import SwiftData

/// Persisted walking graph edge for offline routing.
/// Represents the walk time between two points in a park.
@Model
public final class CachedWalkingEdge {
    /// Compound key for uniqueness (fromId::toId). Enforces one edge per direction pair.
    @Attribute(.unique)
    public var compoundKey: String

    /// Source location ID.
    public var fromId: String

    /// Destination location ID.
    public var toId: String

    /// Walk time in minutes between the two locations.
    public var walkMinutes: Double

    public init(
        fromId: String,
        toId: String,
        walkMinutes: Double
    ) {
        self.compoundKey = "\(fromId)::\(toId)"
        self.fromId = fromId
        self.toId = toId
        self.walkMinutes = walkMinutes
    }
}

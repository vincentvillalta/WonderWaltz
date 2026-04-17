import Foundation
import SwiftData

/// Persisted trip data for offline access.
/// Mirrors the API TripResponse but stored locally via SwiftData.
@Model
public final class CachedTrip {
    /// Server trip ID.
    @Attribute(.unique)
    public var id: String

    /// Trip start date.
    public var startDate: Date

    /// Trip end date.
    public var endDate: Date

    /// Trip status (e.g. "active", "completed").
    public var status: String

    /// Park IDs included in this trip.
    public var parkIds: [String]

    /// Whether park hopper is enabled.
    public var hasHopper: Bool

    /// Budget tier (e.g. "value", "moderate", "deluxe").
    public var budgetTier: String

    /// Entitlement state (e.g. "locked", "unlocked").
    public var entitlementState: String

    /// Last time this trip was synced with the server.
    public var lastSyncedAt: Date

    /// Plans associated with this trip, cascading on delete.
    @Relationship(deleteRule: .cascade, inverse: \CachedPlan.trip)
    public var plans: [CachedPlan]

    public init(
        id: String,
        startDate: Date,
        endDate: Date,
        status: String,
        parkIds: [String],
        hasHopper: Bool,
        budgetTier: String,
        entitlementState: String,
        lastSyncedAt: Date
    ) {
        self.id = id
        self.startDate = startDate
        self.endDate = endDate
        self.status = status
        self.parkIds = parkIds
        self.hasHopper = hasHopper
        self.budgetTier = budgetTier
        self.entitlementState = entitlementState
        self.lastSyncedAt = lastSyncedAt
        self.plans = []
    }
}

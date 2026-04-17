import Foundation
import SwiftData

/// Persisted plan data for offline access.
@Model
public final class CachedPlan {
    /// Server plan ID.
    @Attribute(.unique)
    public var id: String

    /// The trip this plan belongs to.
    public var tripId: String

    /// Plan status (e.g. "generated", "in_progress").
    public var status: String

    /// Plan version for cache invalidation.
    public var version: Int

    /// Beta Forecast framing text (FC-05).
    public var forecastDisclaimer: String?

    /// Last time this plan was synced with the server.
    public var lastSyncedAt: Date

    /// Whether the offline package (catalog + walking graph) has been downloaded.
    public var isDownloadComplete: Bool

    /// Days in this plan, cascading on delete.
    @Relationship(deleteRule: .cascade, inverse: \CachedPlanDay.plan)
    public var days: [CachedPlanDay]

    /// Parent trip relationship.
    public var trip: CachedTrip?

    public init(
        id: String,
        tripId: String,
        status: String,
        version: Int,
        forecastDisclaimer: String? = nil,
        lastSyncedAt: Date,
        isDownloadComplete: Bool = false
    ) {
        self.id = id
        self.tripId = tripId
        self.status = status
        self.version = version
        self.forecastDisclaimer = forecastDisclaimer
        self.lastSyncedAt = lastSyncedAt
        self.isDownloadComplete = isDownloadComplete
        self.days = []
    }
}

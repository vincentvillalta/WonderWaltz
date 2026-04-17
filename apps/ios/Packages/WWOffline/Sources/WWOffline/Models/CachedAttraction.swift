import Foundation
import SwiftData

/// Persisted catalog attraction subset for offline access.
/// Only attractions referenced in a plan are cached.
@Model
public final class CachedAttraction {
    /// Attraction UUID from catalog.
    @Attribute(.unique)
    public var id: String

    /// Display name.
    public var name: String

    /// Park ID this attraction belongs to.
    public var parkId: String

    /// Latitude coordinate (if available).
    public var latitude: Double?

    /// Longitude coordinate (if available).
    public var longitude: Double?

    /// Height requirement in inches (if any).
    public var heightRequirementInches: Int?

    /// Tags for filtering (e.g. "thrill", "dark_ride", "ecv_accessible").
    public var tags: [String]

    /// Lightning Lane type (e.g. "individual", "single_pass", nil if none).
    public var lightningLaneType: String?

    public init(
        id: String,
        name: String,
        parkId: String,
        latitude: Double? = nil,
        longitude: Double? = nil,
        heightRequirementInches: Int? = nil,
        tags: [String] = [],
        lightningLaneType: String? = nil
    ) {
        self.id = id
        self.name = name
        self.parkId = parkId
        self.latitude = latitude
        self.longitude = longitude
        self.heightRequirementInches = heightRequirementInches
        self.tags = tags
        self.lightningLaneType = lightningLaneType
    }
}

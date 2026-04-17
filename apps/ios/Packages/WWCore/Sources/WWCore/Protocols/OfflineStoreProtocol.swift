import Foundation

/// Protocol for offline plan caching.
/// Concrete implementations use SwiftData or GRDB for persistence.
public protocol OfflineStoreProtocol: Sendable {

    /// Cache a plan's data for offline access.
    func cachePlan(planId: String, data: Data) async throws

    /// Retrieve a cached plan by ID.
    func getCachedPlan(planId: String) async throws -> Data?

    /// Check whether a plan is cached locally.
    func isCached(planId: String) async -> Bool

    /// Clear all cached plans.
    func clearCache() async throws
}

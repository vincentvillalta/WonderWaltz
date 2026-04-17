import Foundation
import Network
import Observation
import WWCore

/// Manages background sync state and network monitoring.
/// When connectivity resumes after being offline, triggers data refresh.
/// Per CONTEXT.md: never auto-refreshes without user confirmation when significant changes detected.
@Observable
@MainActor
public final class SyncCoordinator {

    // MARK: - Published state

    /// Whether a sync operation is currently in progress.
    public private(set) var isSyncing: Bool = false

    /// Last successful sync date.
    public private(set) var lastSyncDate: Date?

    /// Whether the device is currently offline.
    public private(set) var isOffline: Bool = false

    /// When true, significant changes were detected — prompt user before refreshing.
    public var pendingRefreshPrompt: Bool = false

    /// Message describing what changed (e.g. "Park hours updated -- refresh your plan?").
    public var pendingRefreshMessage: String?

    // MARK: - Dependencies

    private let apiClient: any APIClientProtocol
    private let offlineStore: OfflineStore
    private let staleThreshold: TimeInterval

    // MARK: - Network monitoring

    private let networkMonitor: NWPathMonitor
    private let monitorQueue: DispatchQueue
    private var wasOffline: Bool = false

    // MARK: - Init

    /// - Parameters:
    ///   - apiClient: Protocol-based API client for fetching fresh data.
    ///   - offlineStore: SwiftData-backed offline store for persistence.
    ///   - staleThreshold: Seconds before cached data is considered stale (default 1 hour).
    public init(
        apiClient: any APIClientProtocol,
        offlineStore: OfflineStore,
        staleThreshold: TimeInterval = 3600
    ) {
        self.apiClient = apiClient
        self.offlineStore = offlineStore
        self.staleThreshold = staleThreshold
        self.networkMonitor = NWPathMonitor()
        self.monitorQueue = DispatchQueue(label: "com.wonderwaltz.network-monitor")
    }

    // MARK: - Network Monitoring

    /// Start monitoring network connectivity changes.
    /// When connection resumes after being offline, sets state for potential sync.
    public func startMonitoringNetwork() {
        networkMonitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor [weak self] in
                guard let self else { return }
                let currentlyOffline = path.status != .satisfied
                let previouslyOffline = self.wasOffline

                self.isOffline = currentlyOffline
                self.wasOffline = currentlyOffline

                // Connection restored — mark that we should sync when appropriate
                if previouslyOffline && !currentlyOffline {
                    // Connectivity restored; sync will happen on next syncIfNeeded call
                }
            }
        }
        networkMonitor.start(queue: monitorQueue)
    }

    /// Stop monitoring network connectivity.
    public func stopMonitoringNetwork() {
        networkMonitor.cancel()
    }

    // MARK: - Sync Logic

    /// Check if cached data for the given trip is stale and refresh if needed.
    /// - Parameter tripId: The trip ID to sync.
    public func syncIfNeeded(tripId: String) async {
        guard !isOffline else { return }
        guard !isSyncing else { return }

        isSyncing = true
        defer { isSyncing = false }

        do {
            // Fetch current trip data from API
            let tripData = try await apiClient.getTrip(id: tripId)

            // Decode to check for plan IDs and versions
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601

            // Check each plan's staleness
            if let tripInfo = try? decoder.decode(TripSyncInfo.self, from: tripData) {
                for planRef in tripInfo.plans {
                    let lastSync = await offlineStore.getLastSyncDate(planId: planRef.id)
                    let isStale = lastSync.map { Date().timeIntervalSince($0) > staleThreshold } ?? true

                    if isStale {
                        // Fetch fresh plan data
                        let planData = try await apiClient.getPlan(id: planRef.id)
                        try await offlineStore.cachePlan(planId: planRef.id, data: planData)

                        // Check for significant changes
                        if planRef.hasSignificantChanges {
                            pendingRefreshPrompt = true
                            pendingRefreshMessage = "Park hours updated -- refresh your plan?"
                        }
                    }
                }
            }

            lastSyncDate = Date()
        } catch {
            // Sync failures are non-fatal — cached data remains available
        }
    }

    /// Dismiss the pending refresh prompt.
    public func dismissRefreshPrompt() {
        pendingRefreshPrompt = false
        pendingRefreshMessage = nil
    }
}

// MARK: - Internal Sync Types

/// Minimal decodable struct for extracting plan references from trip API response.
struct TripSyncInfo: Decodable, Sendable {
    let plans: [PlanRef]

    struct PlanRef: Decodable, Sendable {
        let id: String
        let version: Int
        let hasSignificantChanges: Bool

        enum CodingKeys: String, CodingKey {
            case id, version
            case hasSignificantChanges = "has_significant_changes"
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            id = try container.decode(String.self, forKey: .id)
            version = try container.decodeIfPresent(Int.self, forKey: .version) ?? 1
            hasSignificantChanges = try container.decodeIfPresent(Bool.self, forKey: .hasSignificantChanges) ?? false
        }
    }
}

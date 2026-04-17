import Foundation
import Observation
import WWCore

/// Downloads offline assets (catalog subset + walking graph) after plan generation.
/// Static map tile download is deferred to Phase 6.
@Observable
@MainActor
public final class OfflinePackageDownloader {

    // MARK: - Published state

    /// Whether a download is currently in progress.
    public private(set) var isDownloading: Bool = false

    /// Whether the download is complete (for "Downloaded for offline" badge).
    public private(set) var isDownloadComplete: Bool = false

    /// Progress percentage (0.0 to 1.0).
    public private(set) var downloadProgress: Double = 0.0

    /// Error message if download failed.
    public private(set) var downloadError: String?

    // MARK: - Dependencies

    private let apiClient: any APIClientProtocol
    private let offlineStore: OfflineStore

    // MARK: - Init

    public init(apiClient: any APIClientProtocol, offlineStore: OfflineStore) {
        self.apiClient = apiClient
        self.offlineStore = offlineStore
    }

    // MARK: - Download

    /// Download the offline package for a given plan.
    /// Triggered automatically after plan generation.
    /// Downloads catalog subset (attractions referenced in plan) and walking graph edges.
    /// NOTE: Static map tile download is deferred to Phase 6.
    public func downloadOfflinePackage(for planId: String) async {
        guard !isDownloading else { return }

        isDownloading = true
        isDownloadComplete = false
        downloadProgress = 0.0
        downloadError = nil

        do {
            // Step 1: Fetch plan data to identify referenced attractions
            downloadProgress = 0.1
            let planData = try await apiClient.getPlan(id: planId)

            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let planInfo = try decoder.decode(CachedPlanData.self, from: planData)

            // Extract unique attraction IDs from plan items
            let attractionRefIds = Set(
                planInfo.days.flatMap { day in
                    day.items.compactMap { item -> String? in
                        guard item.type == "attraction" || item.type == "show" else { return nil }
                        return item.refId
                    }
                }
            )

            downloadProgress = 0.3

            // Step 2: Fetch catalog data for referenced attractions
            // For now, we cache attraction metadata from plan items directly.
            // In production, this would call a dedicated catalog subset endpoint.
            let attractions = attractionRefIds.map { refId in
                AttractionData(
                    id: refId,
                    name: "", // Will be populated from catalog endpoint
                    parkId: planInfo.days.first?.parkId ?? ""
                )
            }

            if !attractions.isEmpty {
                try await offlineStore.cacheAttractions(attractions)
            }
            downloadProgress = 0.6

            // Step 3: Fetch walking graph edges between plan locations
            // Extract location pairs from sequential plan items
            var edges: [WalkingEdgeData] = []
            for day in planInfo.days {
                let sortedItems = day.items.sorted { $0.sortOrder < $1.sortOrder }
                for i in 0..<max(0, sortedItems.count - 1) {
                    if let fromId = sortedItems[i].refId,
                       let toId = sortedItems[i + 1].refId,
                       let walkMins = sortedItems[i + 1].walkMinutes {
                        edges.append(WalkingEdgeData(
                            fromId: fromId,
                            toId: toId,
                            walkMinutes: Double(walkMins)
                        ))
                    }
                }
            }

            if !edges.isEmpty {
                try await offlineStore.cacheWalkingGraph(edges)
            }
            downloadProgress = 0.9

            // Step 4: Mark plan as download complete
            try await offlineStore.markDownloadComplete(planId: planId)

            downloadProgress = 1.0
            isDownloadComplete = true
        } catch {
            downloadError = error.localizedDescription
        }

        isDownloading = false
    }
}

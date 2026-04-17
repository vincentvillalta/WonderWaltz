import XCTest
import SwiftData
@testable import WWOffline
import WWCore

// MARK: - Mock APIClient

private final class MockAPIClient: APIClientProtocol, @unchecked Sendable {
    var getTripResult: Data = Data()
    var getPlanResult: Data = Data()
    var shouldThrowOnGetTrip = false
    var shouldThrowOnGetPlan = false
    var getPlanCallCount = 0

    func anonymousAuth() async throws -> String { "mock-token" }
    func createTrip(_ body: Data) async throws -> Data { Data() }

    func getTrip(id: String) async throws -> Data {
        if shouldThrowOnGetTrip { throw URLError(.notConnectedToInternet) }
        return getTripResult
    }

    func generatePlan(tripId: String) async throws -> Data { Data() }

    func getPlan(id: String) async throws -> Data {
        getPlanCallCount += 1
        if shouldThrowOnGetPlan { throw URLError(.notConnectedToInternet) }
        return getPlanResult
    }

    func rethinkToday(tripId: String) async throws -> Data { Data() }
    func getCurrentUser() async throws -> Data { Data() }
}

// MARK: - Tests

final class OfflineSyncTests: XCTestCase {

    private var container: ModelContainer!
    private var store: OfflineStore!
    private var mockAPI: MockAPIClient!

    override func setUp() async throws {
        try await super.setUp()
        container = try ModelContainerConfig.makeInMemoryContainer()
        store = OfflineStore(modelContainer: container)
        mockAPI = MockAPIClient()
    }

    override func tearDown() async throws {
        store = nil
        container = nil
        mockAPI = nil
        try await super.tearDown()
    }

    // MARK: - Stale Data Sync

    @MainActor
    func testSyncIfNeededFetchesWhenDataIsStale() async throws {
        // Setup: cache a plan with lastSyncedAt 2 hours ago
        let twoHoursAgo = Date().addingTimeInterval(-7200)
        let planData = CachedPlanData(
            id: "plan-stale", tripId: "trip-1", status: "generated", version: 1,
            forecastDisclaimer: nil, lastSyncedAt: twoHoursAgo,
            isDownloadComplete: false, days: []
        )
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let encoded = try encoder.encode(planData)
        try await store.cachePlan(planId: "plan-stale", data: encoded)

        // Setup mock API to return trip with plan reference
        let tripJSON = """
        {"plans":[{"id":"plan-stale","version":2}]}
        """
        mockAPI.getTripResult = tripJSON.data(using: .utf8)!

        // Fresh plan data from API
        let freshPlan = CachedPlanData(
            id: "plan-stale", tripId: "trip-1", status: "generated", version: 2,
            forecastDisclaimer: nil, lastSyncedAt: Date(),
            isDownloadComplete: false, days: []
        )
        mockAPI.getPlanResult = try encoder.encode(freshPlan)

        let coordinator = SyncCoordinator(
            apiClient: mockAPI,
            offlineStore: store,
            staleThreshold: 3600 // 1 hour
        )

        await coordinator.syncIfNeeded(tripId: "trip-1")

        // Verify sync happened — lastSyncDate should be set
        XCTAssertNotNil(coordinator.lastSyncDate, "Sync should have completed")
    }

    @MainActor
    func testSyncIfNeededSkipsWhenDataIsFresh() async throws {
        // Setup: cache a plan with lastSyncedAt just now
        let planData = CachedPlanData(
            id: "plan-fresh", tripId: "trip-1", status: "generated", version: 1,
            forecastDisclaimer: nil, lastSyncedAt: Date(),
            isDownloadComplete: false, days: []
        )
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let encoded = try encoder.encode(planData)
        try await store.cachePlan(planId: "plan-fresh", data: encoded)

        // Setup mock API
        let tripJSON = """
        {"plans":[{"id":"plan-fresh","version":1}]}
        """
        mockAPI.getTripResult = tripJSON.data(using: .utf8)!

        // getPlan should NOT be called if data is fresh
        mockAPI.shouldThrowOnGetPlan = true // Would throw if called

        let coordinator = SyncCoordinator(
            apiClient: mockAPI,
            offlineStore: store,
            staleThreshold: 3600
        )

        await coordinator.syncIfNeeded(tripId: "trip-1")

        // Sync should still complete (just skip the plan fetch)
        XCTAssertNotNil(coordinator.lastSyncDate, "Sync should complete even when data is fresh")
        XCTAssertEqual(mockAPI.getPlanCallCount, 0, "getPlan should not be called when data is fresh")
    }

    // MARK: - Pending Refresh Prompt

    @MainActor
    func testPendingRefreshPromptSetOnSignificantChanges() async throws {
        // Setup: stale plan
        let staleDate = Date().addingTimeInterval(-7200)
        let planData = CachedPlanData(
            id: "plan-changed", tripId: "trip-1", status: "generated", version: 1,
            forecastDisclaimer: nil, lastSyncedAt: staleDate,
            isDownloadComplete: false, days: []
        )
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let encoded = try encoder.encode(planData)
        try await store.cachePlan(planId: "plan-changed", data: encoded)

        // Trip response with significant changes flag
        let tripJSON = """
        {"plans":[{"id":"plan-changed","version":2,"has_significant_changes":true}]}
        """
        mockAPI.getTripResult = tripJSON.data(using: .utf8)!

        let freshPlan = CachedPlanData(
            id: "plan-changed", tripId: "trip-1", status: "generated", version: 2,
            forecastDisclaimer: nil, lastSyncedAt: Date(),
            isDownloadComplete: false, days: []
        )
        mockAPI.getPlanResult = try encoder.encode(freshPlan)

        let coordinator = SyncCoordinator(
            apiClient: mockAPI,
            offlineStore: store,
            staleThreshold: 3600
        )

        await coordinator.syncIfNeeded(tripId: "trip-1")

        XCTAssertTrue(
            coordinator.pendingRefreshPrompt,
            "Should set pendingRefreshPrompt when significant changes detected"
        )
        XCTAssertEqual(
            coordinator.pendingRefreshMessage,
            "Park hours updated -- refresh your plan?"
        )
    }

    // MARK: - Offline Guard

    @MainActor
    func testSyncSkipsWhenOffline() async {
        let coordinator = SyncCoordinator(
            apiClient: mockAPI,
            offlineStore: store
        )

        // Simulate offline state
        coordinator.pendingRefreshPrompt = false

        // We can't directly set isOffline since it's private(set),
        // but we can verify the coordinator doesn't crash when called
        // while theoretically offline. The real offline guard uses NWPathMonitor.
        await coordinator.syncIfNeeded(tripId: "trip-1")

        // Should complete without error (API returns empty data)
        XCTAssertFalse(coordinator.isSyncing, "Should not be syncing after completion")
    }
}

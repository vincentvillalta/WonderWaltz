import XCTest
import SwiftData
@testable import WWOffline

final class OfflineTests: XCTestCase {

    private var container: ModelContainer!
    private var store: OfflineStore!

    override func setUp() async throws {
        try await super.setUp()
        container = try ModelContainerConfig.makeInMemoryContainer()
        store = OfflineStore(modelContainer: container)
    }

    override func tearDown() async throws {
        store = nil
        container = nil
        try await super.tearDown()
    }

    // MARK: - Plan Cache Round-Trip

    func testCachePlanAndGetCachedPlanRoundTrip() async throws {
        let planData = makeSamplePlanData(id: "plan-1")
        let encoded = try JSONEncoder.iso8601Encoder.encode(planData)

        try await store.cachePlan(planId: "plan-1", data: encoded)

        let retrieved = try await store.getCachedPlan(planId: "plan-1")
        XCTAssertNotNil(retrieved, "Cached plan should be retrievable")

        let decoded = try JSONDecoder.iso8601Decoder.decode(CachedPlanData.self, from: retrieved!)
        XCTAssertEqual(decoded.id, "plan-1")
        XCTAssertEqual(decoded.tripId, "trip-1")
        XCTAssertEqual(decoded.status, "generated")
        XCTAssertEqual(decoded.version, 1)
        XCTAssertEqual(decoded.days.count, 1)
        XCTAssertEqual(decoded.days.first?.items.count, 2)
    }

    // MARK: - isCached

    func testIsCachedReturnsTrueForCachedPlan() async throws {
        let planData = makeSamplePlanData(id: "plan-cached")
        let encoded = try JSONEncoder.iso8601Encoder.encode(planData)

        try await store.cachePlan(planId: "plan-cached", data: encoded)

        let cached = await store.isCached(planId: "plan-cached")
        XCTAssertTrue(cached, "isCached should return true for a cached plan")
    }

    func testIsCachedReturnsFalseForUnknownPlan() async {
        let cached = await store.isCached(planId: "nonexistent-plan")
        XCTAssertFalse(cached, "isCached should return false for unknown plan ID")
    }

    // MARK: - Wizard Draft Round-Trip

    func testSaveAndLoadWizardDraftRoundTrip() async throws {
        let now = Date()
        let draft = WizardDraftData(
            startDate: now,
            endDate: now.addingTimeInterval(86400 * 3),
            selectedParkIds: ["mk", "epcot"],
            hasHopper: true,
            guestsJSON: "[{\"name\":\"Alice\",\"age\":\"18+\"}]",
            budgetTier: "moderate",
            lodgingType: "resort",
            transportType: "bus",
            mustDoRideIds: ["ride-1", "ride-2"],
            mealPreferences: ["quick-service"],
            currentStep: 5,
            createdAt: now,
            updatedAt: now
        )

        try await store.saveWizardDraft(draft)

        let loaded = await store.loadWizardDraft()
        XCTAssertNotNil(loaded, "Wizard draft should be loadable after save")
        XCTAssertEqual(loaded?.currentStep, 5, "Current step should be preserved")
        XCTAssertEqual(loaded?.selectedParkIds, ["mk", "epcot"])
        XCTAssertEqual(loaded?.hasHopper, true)
        XCTAssertEqual(loaded?.budgetTier, "moderate")
        XCTAssertEqual(loaded?.mustDoRideIds, ["ride-1", "ride-2"])
    }

    func testSaveWizardDraftUpsertsOverPrevious() async throws {
        let draft1 = WizardDraftData(currentStep: 2)
        try await store.saveWizardDraft(draft1)

        let draft2 = WizardDraftData(currentStep: 6)
        try await store.saveWizardDraft(draft2)

        let loaded = await store.loadWizardDraft()
        XCTAssertEqual(loaded?.currentStep, 6, "Upsert should replace old draft")
    }

    // MARK: - Clear Cache

    func testClearCacheRemovesAllData() async throws {
        let planData = makeSamplePlanData(id: "plan-clear")
        let encoded = try JSONEncoder.iso8601Encoder.encode(planData)
        try await store.cachePlan(planId: "plan-clear", data: encoded)

        let draft = WizardDraftData(currentStep: 3)
        try await store.saveWizardDraft(draft)

        try await store.clearCache()

        let planCached = await store.isCached(planId: "plan-clear")
        XCTAssertFalse(planCached, "Plan should be cleared")

        let draftLoaded = await store.loadWizardDraft()
        XCTAssertNil(draftLoaded, "Wizard draft should be cleared")
    }

    // MARK: - Helpers

    private func makeSamplePlanData(id: String) -> CachedPlanData {
        let items = [
            CachedPlanItemData(
                id: "item-1", type: "attraction", refId: "ride-a",
                name: "Space Mountain", startTime: "09:00", endTime: "09:30",
                waitMinutes: 45, walkMinutes: nil, narrativeTip: nil, sortOrder: 0
            ),
            CachedPlanItemData(
                id: "item-2", type: "meal", refId: nil,
                name: "Cosmic Ray's", startTime: "12:00", endTime: "12:45",
                waitMinutes: nil, walkMinutes: 8, narrativeTip: "Try the rotisserie chicken!", sortOrder: 1
            ),
        ]
        let day = CachedPlanDayData(
            id: "day-1", dayNumber: 1, date: Date(),
            parkId: "mk", parkName: "Magic Kingdom",
            narrativeIntro: "Start your day early!", narrativeTip: nil,
            isLocked: false, items: items
        )
        return CachedPlanData(
            id: id, tripId: "trip-1", status: "generated", version: 1,
            forecastDisclaimer: nil, lastSyncedAt: Date(),
            isDownloadComplete: false, days: [day]
        )
    }
}

// MARK: - JSON Encoder/Decoder helpers

private extension JSONEncoder {
    static let iso8601Encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()
}

private extension JSONDecoder {
    static let iso8601Decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()
}

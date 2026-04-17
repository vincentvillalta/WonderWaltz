import XCTest
@testable import WWPlanView
@testable import WWCore

// MARK: - Mock Implementations

final class PlanMockAPIClient: APIClientProtocol, @unchecked Sendable {
    var shouldThrow = false
    var getPlanResult: Data?
    var rethinkResult: Data?
    var rethinkCallCount = 0

    func anonymousAuth() async throws -> String { "mock-token" }
    func createTrip(_ body: Data) async throws -> Data { Data() }
    func getTrip(id: String) async throws -> Data { Data() }
    func generatePlan(tripId: String) async throws -> Data { Data() }
    func getCurrentUser() async throws -> Data { Data() }

    func getPlan(id: String) async throws -> Data {
        if shouldThrow { throw URLError(.badServerResponse) }
        return getPlanResult ?? Data()
    }

    func rethinkToday(tripId: String) async throws -> Data {
        rethinkCallCount += 1
        if shouldThrow { throw URLError(.badServerResponse) }
        return rethinkResult ?? Data()
    }
}

final class PlanMockOfflineStore: OfflineStoreProtocol, @unchecked Sendable {
    var cachedPlans: [String: Data] = [:]
    var cachePlanCallCount = 0
    var shouldThrow = false

    func cachePlan(planId: String, data: Data) async throws {
        cachePlanCallCount += 1
        if shouldThrow { throw URLError(.cannotWriteToFile) }
        cachedPlans[planId] = data
    }

    func getCachedPlan(planId: String) async throws -> Data? {
        if shouldThrow { throw URLError(.cannotLoadFromNetwork) }
        return cachedPlans[planId]
    }

    func isCached(planId: String) async -> Bool {
        cachedPlans[planId] != nil
    }

    func clearCache() async throws {
        cachedPlans.removeAll()
    }
}

final class PlanMockAnalytics: AnalyticsProtocol, @unchecked Sendable {
    var capturedEvents: [(String, [String: Any])] = []

    func capture(_ event: String, properties: [String: Any]) {
        capturedEvents.append((event, properties))
    }

    func identify(_ userId: String) {}
    func reset() {}
}

// MARK: - Test Helpers

private func makePlanJSON(
    id: String = "plan-1",
    tripId: String = "trip-1",
    days: [[String: Any]]? = nil,
    forecastConfidence: String? = "beta"
) -> Data {
    let defaultDays: [[String: Any]] = [
        [
            "dayNumber": 1,
            "date": "2026-05-01",
            "parkName": "Magic Kingdom",
            "parkAbbreviation": "MK",
            "isLocked": false,
            "items": [
                [
                    "id": "item-1",
                    "type": "attraction",
                    "name": "Space Mountain",
                    "startTime": "09:00",
                    "sortOrder": 0,
                    "isLightningLane": false,
                    "isADR": false,
                    "isMobileOrder": false,
                    "isCompleted": false
                ] as [String: Any]
            ]
        ] as [String: Any],
        [
            "dayNumber": 2,
            "date": "2026-05-02",
            "parkName": "EPCOT",
            "parkAbbreviation": "EP",
            "isLocked": true,
            "items": [] as [[String: Any]]
        ] as [String: Any]
    ]

    var dict: [String: Any] = [
        "id": id,
        "tripId": tripId,
        "days": days ?? defaultDays,
        "status": "ready"
    ]
    if let fc = forecastConfidence {
        dict["forecastConfidence"] = fc
    }
    return try! JSONSerialization.data(withJSONObject: dict)
}

// MARK: - PlanViewTests

@MainActor
final class PlanViewTests: XCTestCase {

    private var mockAPI: PlanMockAPIClient!
    private var mockStore: PlanMockOfflineStore!
    private var mockAnalytics: PlanMockAnalytics!

    override func setUp() {
        super.setUp()
        mockAPI = PlanMockAPIClient()
        mockStore = PlanMockOfflineStore()
        mockAnalytics = PlanMockAnalytics()

        // Reset notification permission flag for each test
        UserDefaults.standard.removeObject(forKey: PlanViewModel.notificationPermissionKey)
    }

    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: PlanViewModel.notificationPermissionKey)
        super.tearDown()
    }

    // MARK: - Helpers

    private func makeVM(
        apiClient: PlanMockAPIClient? = nil,
        offlineStore: PlanMockOfflineStore? = nil,
        analytics: PlanMockAnalytics? = nil
    ) -> PlanViewModel {
        PlanViewModel(
            apiClient: apiClient ?? mockAPI,
            offlineStore: offlineStore ?? mockStore,
            analytics: analytics ?? mockAnalytics,
            requestNotificationAuthorization: { true }
        )
    }

    // MARK: - Load Plan Tests

    func testLoadPlanFromAPIPopulatesPlan() async {
        mockAPI.getPlanResult = makePlanJSON()
        let vm = makeVM()

        await vm.loadPlan(planId: "plan-1")

        XCTAssertNotNil(vm.plan)
        XCTAssertEqual(vm.plan?.id, "plan-1")
        XCTAssertEqual(vm.plan?.days.count, 2)
        XCTAssertFalse(vm.isLoading)
        XCTAssertFalse(vm.isOffline)
    }

    func testLoadPlanFallsBackToCache() async {
        let planData = makePlanJSON(id: "plan-cached")
        mockAPI.shouldThrow = true
        mockStore.cachedPlans["plan-cached"] = planData
        let vm = makeVM()

        await vm.loadPlan(planId: "plan-cached")

        XCTAssertNotNil(vm.plan)
        XCTAssertEqual(vm.plan?.id, "plan-cached")
        XCTAssertTrue(vm.isOffline)
        XCTAssertFalse(vm.isLoading)
    }

    func testLoadPlanSetsErrorWhenBothFail() async {
        mockAPI.shouldThrow = true
        let vm = makeVM()

        await vm.loadPlan(planId: "plan-missing")

        XCTAssertNil(vm.plan)
        XCTAssertNotNil(vm.error)
        XCTAssertFalse(vm.isLoading)
    }

    func testLoadPlanCachesAfterAPISuccess() async {
        mockAPI.getPlanResult = makePlanJSON()
        let vm = makeVM()

        await vm.loadPlan(planId: "plan-1")

        XCTAssertEqual(mockStore.cachePlanCallCount, 1)
    }

    // MARK: - Day Selection Tests

    func testSelectDayUpdatesIndex() async {
        mockAPI.getPlanResult = makePlanJSON()
        let vm = makeVM()

        await vm.loadPlan(planId: "plan-1")
        XCTAssertEqual(vm.selectedDayIndex, 0)

        vm.selectDay(index: 1)
        XCTAssertEqual(vm.selectedDayIndex, 1)
        XCTAssertEqual(vm.currentDay?.parkName, "EPCOT")
    }

    func testSelectDayIgnoresInvalidIndex() async {
        mockAPI.getPlanResult = makePlanJSON()
        let vm = makeVM()

        await vm.loadPlan(planId: "plan-1")
        vm.selectDay(index: 99)
        XCTAssertEqual(vm.selectedDayIndex, 0) // unchanged
    }

    // MARK: - Skip / Done Tests

    func testSkipItem() {
        let vm = makeVM()

        XCTAssertTrue(vm.skippedItems.isEmpty)

        vm.skipItem("item-1")

        XCTAssertTrue(vm.skippedItems.contains("item-1"))
        XCTAssertEqual(vm.skippedItems.count, 1)
    }

    func testMarkDone() {
        let vm = makeVM()

        XCTAssertTrue(vm.skippedItems.isEmpty)
        XCTAssertTrue(vm.completedItemIds.isEmpty)

        vm.markDone("item-1")

        XCTAssertTrue(vm.skippedItems.contains("item-1"))
        XCTAssertTrue(vm.completedItemIds.contains("item-1"))
    }

    // MARK: - Park Color Mapping Tests

    func testParkColorMapping() {
        let vm = makeVM()

        let mkDay = PlanDayData(
            dayNumber: 1, date: "2026-05-01",
            parkName: "Magic Kingdom", parkAbbreviation: "MK"
        )
        XCTAssertEqual(vm.parkColor(for: mkDay), .magicKingdom)

        let epcotDay = PlanDayData(
            dayNumber: 2, date: "2026-05-02",
            parkName: "EPCOT", parkAbbreviation: "EP"
        )
        XCTAssertEqual(vm.parkColor(for: epcotDay), .epcot)

        let hsDay = PlanDayData(
            dayNumber: 3, date: "2026-05-03",
            parkName: "Hollywood Studios", parkAbbreviation: "HS"
        )
        XCTAssertEqual(vm.parkColor(for: hsDay), .hollywoodStudios)

        let akDay = PlanDayData(
            dayNumber: 4, date: "2026-05-04",
            parkName: "Animal Kingdom", parkAbbreviation: "AK"
        )
        XCTAssertEqual(vm.parkColor(for: akDay), .animalKingdom)
    }

    func testParkColorMappingDefaultsToMagicKingdom() {
        let vm = makeVM()

        let unknownDay = PlanDayData(
            dayNumber: 1, date: "2026-05-01",
            parkName: "Unknown Park", parkAbbreviation: "UP"
        )
        XCTAssertEqual(vm.parkColor(for: unknownDay), .magicKingdom)
    }

    // MARK: - Notification Permission Tests

    func testNotificationPermissionSetsFlag() async {
        mockAPI.getPlanResult = makePlanJSON()
        let vm = makeVM()

        XCTAssertFalse(UserDefaults.standard.bool(forKey: PlanViewModel.notificationPermissionKey))

        await vm.loadPlan(planId: "plan-1")

        XCTAssertTrue(UserDefaults.standard.bool(forKey: PlanViewModel.notificationPermissionKey))
    }

    func testNotificationPermissionNoOpOnSecondCall() async {
        // Pre-set the flag
        UserDefaults.standard.set(true, forKey: PlanViewModel.notificationPermissionKey)

        let vm = makeVM()

        await vm.requestNotificationPermissionIfNeeded()

        // Should not fire analytics since flag already set (returns early)
        let notifEvents = mockAnalytics.capturedEvents.filter { $0.0 == "notification_permission_requested" }
        XCTAssertTrue(notifEvents.isEmpty)
        XCTAssertTrue(UserDefaults.standard.bool(forKey: PlanViewModel.notificationPermissionKey))
    }

    // MARK: - Rethink Tests

    func testRethinkSetsIsRethinkingDuringExecution() async {
        let rethinkPlan = makePlanJSON()
        mockAPI.getPlanResult = makePlanJSON()
        mockAPI.rethinkResult = rethinkPlan
        let vm = makeVM()

        await vm.loadPlan(planId: "plan-1")
        XCTAssertFalse(vm.isRethinking)

        await vm.rethinkToday()

        // After completion, isRethinking should be false
        XCTAssertFalse(vm.isRethinking)
        XCTAssertEqual(mockAPI.rethinkCallCount, 1)
    }

    func testRethinkOfflineShowsError() async {
        mockAPI.getPlanResult = makePlanJSON()
        let vm = makeVM()

        await vm.loadPlan(planId: "plan-1")
        vm.isOffline = true

        await vm.rethinkToday()

        XCTAssertNotNil(vm.error)
        XCTAssertFalse(vm.isRethinking)
    }

    func testRethinkClearsSkippedItems() async {
        mockAPI.getPlanResult = makePlanJSON()
        mockAPI.rethinkResult = makePlanJSON()
        let vm = makeVM()

        await vm.loadPlan(planId: "plan-1")
        vm.skipItem("item-1")
        vm.markDone("item-2")
        XCTAssertFalse(vm.skippedItems.isEmpty)

        await vm.rethinkToday()

        XCTAssertTrue(vm.skippedItems.isEmpty)
        XCTAssertTrue(vm.completedItemIds.isEmpty)
    }

    // MARK: - Analytics Tests

    func testPlanViewedEventTracked() async {
        mockAPI.getPlanResult = makePlanJSON()
        let vm = makeVM()

        await vm.loadPlan(planId: "plan-1")

        let viewedEvents = mockAnalytics.capturedEvents.filter { $0.0 == "plan_viewed" }
        XCTAssertFalse(viewedEvents.isEmpty)
    }

    // MARK: - Computed Properties Tests

    func testCurrentDayReturnsNilWhenNoPlan() {
        let vm = makeVM()

        XCTAssertNil(vm.currentDay)
        XCTAssertTrue(vm.days.isEmpty)
    }
}

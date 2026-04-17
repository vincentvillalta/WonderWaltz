import XCTest
@testable import WWTripWizard
@testable import WWCore

// MARK: - Mock Implementations

@MainActor
final class MockWizardDraftStore: WizardDraftStoreProtocol {
    var savedDraft: WizardDraftSnapshot?
    var saveDraftCallCount = 0
    var draftToReturn: WizardDraftSnapshot?

    func saveDraft(_ snapshot: WizardDraftSnapshot) async throws {
        saveDraftCallCount += 1
        savedDraft = snapshot
    }

    func loadDraft() async -> WizardDraftSnapshot? {
        return draftToReturn
    }
}

final class WizardMockAPIClient: APIClientProtocol, @unchecked Sendable {
    var shouldThrow = false
    var createTripResult = Data()
    var generatePlanResult = Data()

    func anonymousAuth() async throws -> String { "mock-token" }

    func createTrip(_ body: Data) async throws -> Data {
        if shouldThrow { throw URLError(.badServerResponse) }
        return createTripResult
    }

    func getTrip(id: String) async throws -> Data { Data() }

    func generatePlan(tripId: String) async throws -> Data {
        if shouldThrow { throw URLError(.badServerResponse) }
        return generatePlanResult
    }

    func getPlan(id: String) async throws -> Data { Data() }
    func rethinkToday(tripId: String) async throws -> Data { Data() }
    func getCurrentUser() async throws -> Data { Data() }
}

// MARK: - WizardTests

@MainActor
final class WizardTests: XCTestCase {

    private var mockAPI: WizardMockAPIClient!
    private var mockStore: MockWizardDraftStore!

    override func setUp() {
        super.setUp()
        mockAPI = WizardMockAPIClient()
        mockStore = MockWizardDraftStore()
    }

    // MARK: - WizardStep Enum Tests

    func testWizardStepHasExactly8Cases() {
        XCTAssertEqual(WizardStep.allCases.count, 8)
    }

    func testWizardStepOrderIsCorrect() {
        let expected: [WizardStep] = [
            .dates, .parks, .guests, .budget,
            .lodging, .mustDoRides, .mealPrefs, .review
        ]
        XCTAssertEqual(WizardStep.allCases, expected)
    }

    // MARK: - Navigation Tests

    func testAdvanceStepMovesFromDatesToParks() async {
        let vm = WizardViewModel(apiClient: mockAPI, draftStore: mockStore)
        XCTAssertEqual(vm.currentStep, .dates)

        await vm.advanceStep()
        XCTAssertEqual(vm.currentStep, .parks)
    }

    func testGoBackMovesFromParksToDates() async {
        let vm = WizardViewModel(
            apiClient: mockAPI,
            draftStore: mockStore,
            draft: WizardDraftSnapshot(currentStep: WizardStep.parks.rawValue)
        )
        XCTAssertEqual(vm.currentStep, .parks)

        await vm.goBack()
        XCTAssertEqual(vm.currentStep, .dates)
    }

    func testGoBackOnFirstStepStaysOnDates() async {
        let vm = WizardViewModel(apiClient: mockAPI, draftStore: mockStore)
        XCTAssertEqual(vm.currentStep, .dates)

        await vm.goBack()
        XCTAssertEqual(vm.currentStep, .dates)
    }

    func testAdvanceStepOnReviewDoesNotAdvancePastEnd() async {
        let vm = WizardViewModel(
            apiClient: mockAPI,
            draftStore: mockStore,
            draft: WizardDraftSnapshot(currentStep: WizardStep.review.rawValue)
        )
        XCTAssertEqual(vm.currentStep, .review)

        await vm.advanceStep()
        XCTAssertEqual(vm.currentStep, .review)
    }

    // MARK: - Auto-Save Tests

    func testAdvanceStepCallsSaveDraft() async {
        let vm = WizardViewModel(apiClient: mockAPI, draftStore: mockStore)
        XCTAssertEqual(mockStore.saveDraftCallCount, 0)

        await vm.advanceStep()
        XCTAssertEqual(mockStore.saveDraftCallCount, 1)
    }

    func testGoBackCallsSaveDraft() async {
        let vm = WizardViewModel(
            apiClient: mockAPI,
            draftStore: mockStore,
            draft: WizardDraftSnapshot(currentStep: WizardStep.parks.rawValue)
        )

        await vm.goBack()
        XCTAssertEqual(mockStore.saveDraftCallCount, 1)
    }

    // MARK: - Draft Restoration Tests

    func testDraftRestorationRestoresStep() {
        let draft = WizardDraftSnapshot(currentStep: WizardStep.budget.rawValue)
        let vm = WizardViewModel(apiClient: mockAPI, draftStore: mockStore, draft: draft)

        XCTAssertEqual(vm.currentStep, .budget)
    }

    func testDraftRestorationRestoresParks() {
        let draft = WizardDraftSnapshot(
            selectedParkIds: ["mk", "epcot"],
            hasHopper: true,
            currentStep: WizardStep.parks.rawValue
        )
        let vm = WizardViewModel(apiClient: mockAPI, draftStore: mockStore, draft: draft)

        XCTAssertEqual(vm.selectedParkIds, ["mk", "epcot"])
        XCTAssertTrue(vm.hasHopper)
    }

    func testDraftRestorationRestoresGuests() {
        let guest = GuestInput(name: "Alice", ageBracket: "18+", hasDAS: true)
        let guestsData = try! JSONEncoder().encode([guest])
        let guestsJSON = String(data: guestsData, encoding: .utf8)!

        let draft = WizardDraftSnapshot(
            guestsJSON: guestsJSON,
            currentStep: WizardStep.guests.rawValue
        )
        let vm = WizardViewModel(apiClient: mockAPI, draftStore: mockStore, draft: draft)

        XCTAssertEqual(vm.guests.count, 1)
        XCTAssertEqual(vm.guests.first?.name, "Alice")
        XCTAssertTrue(vm.guests.first?.hasDAS ?? false)
    }

    // MARK: - Progress Tests

    func testProgressValueCalculation() {
        let vm = WizardViewModel(apiClient: mockAPI, draftStore: mockStore)
        XCTAssertEqual(vm.progress, 0.0, accuracy: 0.01)

        let vm2 = WizardViewModel(
            apiClient: mockAPI,
            draftStore: mockStore,
            draft: WizardDraftSnapshot(currentStep: WizardStep.review.rawValue)
        )
        XCTAssertEqual(vm2.progress, 1.0, accuracy: 0.01)
    }
}

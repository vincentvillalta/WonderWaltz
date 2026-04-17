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

    func testWizardStepHasExactly4Cases() {
        XCTAssertEqual(WizardStep.allCases.count, 4)
    }

    func testWizardStepOrderIsCorrect() {
        let expected: [WizardStep] = [
            .datesParty, .resortTickets, .dining, .pacePriorities
        ]
        XCTAssertEqual(WizardStep.allCases, expected)
    }

    func testWizardStepTitles() {
        XCTAssertEqual(WizardStep.datesParty.title, "Dates & Party")
        XCTAssertEqual(WizardStep.resortTickets.title, "Resort & Tickets")
        XCTAssertEqual(WizardStep.dining.title, "Dining ADRs")
        XCTAssertEqual(WizardStep.pacePriorities.title, "Pace & Priorities")
    }

    func testWizardStepSubtitles() {
        XCTAssertFalse(WizardStep.datesParty.subtitle.isEmpty)
        XCTAssertFalse(WizardStep.resortTickets.subtitle.isEmpty)
        XCTAssertFalse(WizardStep.dining.subtitle.isEmpty)
        XCTAssertFalse(WizardStep.pacePriorities.subtitle.isEmpty)
    }

    // MARK: - Navigation Tests

    func testAdvanceStepMovesFromDatesPartyToResortTickets() async {
        let vm = WizardViewModel(apiClient: mockAPI, draftStore: mockStore)
        XCTAssertEqual(vm.currentStep, .datesParty)

        await vm.advanceStep()
        XCTAssertEqual(vm.currentStep, .resortTickets)
    }

    func testAdvanceStepMovesThrough4Steps() async {
        let vm = WizardViewModel(apiClient: mockAPI, draftStore: mockStore)
        XCTAssertEqual(vm.currentStep, .datesParty)

        await vm.advanceStep()
        XCTAssertEqual(vm.currentStep, .resortTickets)

        await vm.advanceStep()
        XCTAssertEqual(vm.currentStep, .dining)

        await vm.advanceStep()
        XCTAssertEqual(vm.currentStep, .pacePriorities)
    }

    func testGoBackMovesFromResortTicketsToDatesParty() async {
        let vm = WizardViewModel(
            apiClient: mockAPI,
            draftStore: mockStore,
            draft: WizardDraftSnapshot(
                currentStep: WizardStep.resortTickets.rawValue
            )
        )
        XCTAssertEqual(vm.currentStep, .resortTickets)

        await vm.goBack()
        XCTAssertEqual(vm.currentStep, .datesParty)
    }

    func testGoBackOnFirstStepStaysOnDatesParty() async {
        let vm = WizardViewModel(apiClient: mockAPI, draftStore: mockStore)
        XCTAssertEqual(vm.currentStep, .datesParty)

        await vm.goBack()
        XCTAssertEqual(vm.currentStep, .datesParty)
    }

    func testAdvanceOnLastStepDoesNotAdvancePast() async {
        let vm = WizardViewModel(
            apiClient: mockAPI,
            draftStore: mockStore,
            draft: WizardDraftSnapshot(
                currentStep: WizardStep.pacePriorities.rawValue
            )
        )
        XCTAssertEqual(vm.currentStep, .pacePriorities)

        await vm.advanceStep()
        XCTAssertEqual(vm.currentStep, .pacePriorities)
    }

    func testCanGoBackIsFalseOnFirstStep() {
        let vm = WizardViewModel(apiClient: mockAPI, draftStore: mockStore)
        XCTAssertFalse(vm.canGoBack)
    }

    func testCanGoBackIsTrueOnSecondStep() {
        let vm = WizardViewModel(
            apiClient: mockAPI,
            draftStore: mockStore,
            draft: WizardDraftSnapshot(
                currentStep: WizardStep.resortTickets.rawValue
            )
        )
        XCTAssertTrue(vm.canGoBack)
    }

    func testIsOnLastStepTrueOnPacePriorities() {
        let vm = WizardViewModel(
            apiClient: mockAPI,
            draftStore: mockStore,
            draft: WizardDraftSnapshot(
                currentStep: WizardStep.pacePriorities.rawValue
            )
        )
        XCTAssertTrue(vm.isOnLastStep)
    }

    func testIsOnLastStepFalseOnOtherSteps() {
        let vm = WizardViewModel(apiClient: mockAPI, draftStore: mockStore)
        XCTAssertFalse(vm.isOnLastStep)
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
            draft: WizardDraftSnapshot(
                currentStep: WizardStep.resortTickets.rawValue
            )
        )

        await vm.goBack()
        XCTAssertEqual(mockStore.saveDraftCallCount, 1)
    }

    // MARK: - Draft Restoration Tests

    func testDraftRestorationRestoresStep() {
        let draft = WizardDraftSnapshot(
            currentStep: WizardStep.dining.rawValue
        )
        let vm = WizardViewModel(
            apiClient: mockAPI,
            draftStore: mockStore,
            draft: draft
        )

        XCTAssertEqual(vm.currentStep, .dining)
    }

    func testDraftRestorationRestoresParks() {
        let draft = WizardDraftSnapshot(
            selectedParkIds: ["mk", "epcot"],
            hasHopper: true,
            currentStep: WizardStep.resortTickets.rawValue
        )
        let vm = WizardViewModel(
            apiClient: mockAPI,
            draftStore: mockStore,
            draft: draft
        )

        XCTAssertEqual(vm.selectedParkIds, ["mk", "epcot"])
        XCTAssertTrue(vm.hasHopper)
    }

    func testDraftRestorationRestoresGuests() {
        let guest = GuestInput(
            name: "Alice",
            ageBracket: "18+",
            hasDAS: true
        )
        let guestsData = try! JSONEncoder().encode([guest])
        let guestsJSON = String(data: guestsData, encoding: .utf8)!

        let draft = WizardDraftSnapshot(
            guestsJSON: guestsJSON,
            currentStep: WizardStep.datesParty.rawValue
        )
        let vm = WizardViewModel(
            apiClient: mockAPI,
            draftStore: mockStore,
            draft: draft
        )

        XCTAssertEqual(vm.guests.count, 1)
        XCTAssertEqual(vm.guests.first?.name, "Alice")
        XCTAssertTrue(vm.guests.first?.hasDAS ?? false)
    }

    func testDraftRestorationRestoresDiningPrefs() {
        let draft = WizardDraftSnapshot(
            currentStep: WizardStep.dining.rawValue,
            diningBudget: "premium",
            characterDining: "skip",
            wantDiningSuggestions: false
        )
        let vm = WizardViewModel(
            apiClient: mockAPI,
            draftStore: mockStore,
            draft: draft
        )

        XCTAssertEqual(vm.diningBudget, .premium)
        XCTAssertEqual(vm.characterDining, .skip)
        XCTAssertFalse(vm.wantDiningSuggestions)
    }

    func testDraftRestorationRestoresPace() {
        let draft = WizardDraftSnapshot(
            currentStep: WizardStep.pacePriorities.rawValue,
            paceValue: 85.0
        )
        let vm = WizardViewModel(
            apiClient: mockAPI,
            draftStore: mockStore,
            draft: draft
        )

        XCTAssertEqual(vm.paceValue, 85.0, accuracy: 0.01)
    }

    // MARK: - Progress Tests

    func testProgressValueStep0Is25Percent() {
        let vm = WizardViewModel(apiClient: mockAPI, draftStore: mockStore)
        XCTAssertEqual(vm.progress, 0.25, accuracy: 0.01)
    }

    func testProgressValueStep1Is50Percent() {
        let vm = WizardViewModel(
            apiClient: mockAPI,
            draftStore: mockStore,
            draft: WizardDraftSnapshot(
                currentStep: WizardStep.resortTickets.rawValue
            )
        )
        XCTAssertEqual(vm.progress, 0.50, accuracy: 0.01)
    }

    func testProgressValueStep2Is75Percent() {
        let vm = WizardViewModel(
            apiClient: mockAPI,
            draftStore: mockStore,
            draft: WizardDraftSnapshot(
                currentStep: WizardStep.dining.rawValue
            )
        )
        XCTAssertEqual(vm.progress, 0.75, accuracy: 0.01)
    }

    func testProgressValueStep3Is100Percent() {
        let vm = WizardViewModel(
            apiClient: mockAPI,
            draftStore: mockStore,
            draft: WizardDraftSnapshot(
                currentStep: WizardStep.pacePriorities.rawValue
            )
        )
        XCTAssertEqual(vm.progress, 1.0, accuracy: 0.01)
    }

    func testTotalStepsIs4() {
        let vm = WizardViewModel(apiClient: mockAPI, draftStore: mockStore)
        XCTAssertEqual(vm.totalSteps, 4)
    }

    // MARK: - Snapshot Build Tests

    func testBuildSnapshotPreservesAllState() {
        let vm = WizardViewModel(apiClient: mockAPI, draftStore: mockStore)
        vm.startDate = Date(timeIntervalSince1970: 1_800_000_000)
        vm.endDate = Date(timeIntervalSince1970: 1_800_500_000)
        vm.selectedParkIds = ["mk", "epcot"]
        vm.hasHopper = true
        vm.paceValue = 42.0
        vm.diningBudget = .premium
        vm.characterDining = .nice
        vm.wantDiningSuggestions = false

        let snapshot = vm.buildSnapshot()

        XCTAssertEqual(snapshot.selectedParkIds, ["mk", "epcot"])
        XCTAssertTrue(snapshot.hasHopper)
        XCTAssertEqual(snapshot.paceValue, 42.0, accuracy: 0.01)
        XCTAssertEqual(snapshot.diningBudget, "premium")
        XCTAssertEqual(snapshot.characterDining, "nice")
        XCTAssertFalse(snapshot.wantDiningSuggestions)
    }
}

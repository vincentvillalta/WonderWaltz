import XCTest
@testable import WWOnboarding

/// Unit tests for OnboardingViewModel.
/// Validates page navigation, skip, and completion callbacks.
@MainActor
final class OnboardingTests: XCTestCase {

    // MARK: - Initial State

    func testCurrentPageStartsAtZero() {
        let vm = OnboardingViewModel(onComplete: {})
        XCTAssertEqual(vm.currentPage, 0)
    }

    func testTotalPagesMatchesPageDefinitions() {
        let vm = OnboardingViewModel(onComplete: {})
        XCTAssertEqual(vm.totalPages, OnboardingViewModel.pages.count)
        XCTAssertGreaterThan(vm.totalPages, 0, "Must have at least one onboarding page")
    }

    // MARK: - advancePage()

    func testAdvancePageIncrementsCurrentPage() {
        let vm = OnboardingViewModel(onComplete: {})
        XCTAssertEqual(vm.currentPage, 0)

        vm.advancePage()
        XCTAssertEqual(vm.currentPage, 1)

        vm.advancePage()
        XCTAssertEqual(vm.currentPage, 2)
    }

    func testAdvancePageOnLastPageCallsCompletion() {
        var completionCalled = false
        let vm = OnboardingViewModel(onComplete: { completionCalled = true })

        // Navigate to last page
        for _ in 0 ..< vm.totalPages - 1 {
            vm.advancePage()
        }
        XCTAssertEqual(vm.currentPage, vm.totalPages - 1)
        XCTAssertFalse(completionCalled)

        // Advance past last page -> should call completion
        vm.advancePage()
        XCTAssertTrue(completionCalled)
    }

    func testAdvancePageDoesNotExceedLastPage() {
        var completionCallCount = 0
        let vm = OnboardingViewModel(onComplete: { completionCallCount += 1 })

        // Navigate to last page
        for _ in 0 ..< vm.totalPages - 1 {
            vm.advancePage()
        }

        let lastPage = vm.currentPage
        // Advance past last page calls completion but doesn't increment page
        vm.advancePage()
        XCTAssertEqual(vm.currentPage, lastPage, "Page should not increment past last page")
        XCTAssertEqual(completionCallCount, 1)
    }

    // MARK: - skip()

    func testSkipCallsCompletionFromFirstPage() {
        var completionCalled = false
        let vm = OnboardingViewModel(onComplete: { completionCalled = true })

        vm.skip()
        XCTAssertTrue(completionCalled)
    }

    func testSkipCallsCompletionFromMiddlePage() {
        var completionCalled = false
        let vm = OnboardingViewModel(onComplete: { completionCalled = true })

        vm.advancePage() // move to page 1
        XCTAssertEqual(vm.currentPage, 1)

        vm.skip()
        XCTAssertTrue(completionCalled)
    }

    func testSkipCallsCompletionRegardlessOfCurrentPage() {
        for targetPage in 0 ..< OnboardingViewModel.pages.count {
            var completionCalled = false
            let vm = OnboardingViewModel(onComplete: { completionCalled = true })

            for _ in 0 ..< targetPage {
                vm.advancePage()
            }

            vm.skip()
            XCTAssertTrue(
                completionCalled,
                "Skip should call completion from page \(targetPage)"
            )
        }
    }

    // MARK: - Page Data

    func testPageDataIsComplete() {
        for (index, page) in OnboardingViewModel.pages.enumerated() {
            XCTAssertFalse(page.systemImage.isEmpty,
                           "Page \(index) must have a system image")
            XCTAssertFalse(page.titleKey.isEmpty,
                           "Page \(index) must have a title")
            XCTAssertFalse(page.subtitleKey.isEmpty,
                           "Page \(index) must have a subtitle")
        }
    }
}

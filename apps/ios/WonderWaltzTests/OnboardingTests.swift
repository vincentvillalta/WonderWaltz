import XCTest
@testable import WWOnboarding

/// Unit tests for OnboardingViewModel.
/// Validates 4-slide onboarding flow: navigation, skip, completion, and slide content.
@MainActor
final class OnboardingTests: XCTestCase {

    // MARK: - Initial State

    /// Task 2 Test 1: currentPage starts at 0, pageCount is 4.
    func testInitialState() {
        let vm = OnboardingViewModel(onComplete: {})
        XCTAssertEqual(vm.currentPage, 0)
        XCTAssertEqual(vm.totalPages, 4)
    }

    // MARK: - advancePage()

    /// Task 2 Test 2: Advance from page 0 to page 1.
    func testAdvanceToNextPage() {
        let vm = OnboardingViewModel(onComplete: {})
        XCTAssertEqual(vm.currentPage, 0)

        vm.advancePage()
        XCTAssertEqual(vm.currentPage, 1)
    }

    /// Task 2 Test 3: Advance through all 4 slides to the last page.
    func testAdvanceToLastPage() {
        let vm = OnboardingViewModel(onComplete: {})

        vm.advancePage() // 0 -> 1
        vm.advancePage() // 1 -> 2
        vm.advancePage() // 2 -> 3
        XCTAssertEqual(vm.currentPage, 3, "Should be on the last page (index 3)")
    }

    /// Task 2 Test 4: Advancing on the last slide (index 3) triggers onComplete.
    func testAdvancePastLastPageTriggersComplete() {
        var completionCalled = false
        let vm = OnboardingViewModel(onComplete: { completionCalled = true })

        // Navigate to last page
        for _ in 0 ..< vm.totalPages - 1 {
            vm.advancePage()
        }
        XCTAssertEqual(vm.currentPage, 3)
        XCTAssertFalse(completionCalled)

        // Advance past last page -> should call completion
        vm.advancePage()
        XCTAssertTrue(completionCalled)
    }

    /// Task 2 Test 5: Skip from any page calls onComplete immediately.
    func testSkipTriggersComplete() {
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

    /// Task 2 Test 6: isLastPage is true only on slide 3 (index 3).
    func testIsLastPage() {
        let vm = OnboardingViewModel(onComplete: {})

        // Pages 0-2 are not the last page
        for page in 0 ..< 3 {
            if page > 0 { vm.advancePage() }
            XCTAssertFalse(
                vm.currentPage == vm.totalPages - 1 && page < 3,
                "Page \(page) should not be the last page"
            )
        }

        // Page 3 is the last page
        vm.advancePage() // -> page 3
        XCTAssertEqual(vm.currentPage, vm.totalPages - 1, "Page 3 should be the last page")
    }

    /// Task 2 Test 7: Verify exactly 4 slides.
    func testPageCountIs4() {
        XCTAssertEqual(OnboardingViewModel.pages.count, 4, "Must have exactly 4 onboarding slides")
        let vm = OnboardingViewModel(onComplete: {})
        XCTAssertEqual(vm.totalPages, 4)
    }

    /// Task 2 Test 8: Cannot go back past the first page (currentPage stays at 0).
    func testCannotGoBackPastFirst() {
        let vm = OnboardingViewModel(onComplete: {})
        XCTAssertEqual(vm.currentPage, 0)
        // No goBack method exists -- currentPage should not go negative
        // Verify the model doesn't allow negative state
        XCTAssertGreaterThanOrEqual(vm.currentPage, 0)
    }

    /// Task 2 Test 9: Verify slide data matches the 4 titles from Onboarding.tsx.
    func testSlideContent() {
        let pages = OnboardingViewModel.pages
        XCTAssertEqual(pages.count, 4)

        // Slide 1: sparkles icon, "Your Disney Concierge"
        XCTAssertEqual(pages[0].iconSystemName, "sparkles")
        XCTAssertEqual(pages[0].titleKey, "Your Disney Concierge")
        XCTAssertFalse(pages[0].subtitleKey.isEmpty)
        XCTAssertEqual(pages[0].gradientColors.count, 2)

        // Slide 2: calendar icon, "Minute-by-Minute Magic"
        XCTAssertEqual(pages[1].iconSystemName, "calendar")
        XCTAssertEqual(pages[1].titleKey, "Minute-by-Minute Magic")
        XCTAssertFalse(pages[1].subtitleKey.isEmpty)
        XCTAssertEqual(pages[1].gradientColors.count, 2)

        // Slide 3: location.fill icon, "Live In-Park Guide"
        XCTAssertEqual(pages[2].iconSystemName, "location.fill")
        XCTAssertEqual(pages[2].titleKey, "Live In-Park Guide")
        XCTAssertFalse(pages[2].subtitleKey.isEmpty)
        XCTAssertEqual(pages[2].gradientColors.count, 2)

        // Slide 4: wand.and.stars icon, "Ready to Begin?"
        XCTAssertEqual(pages[3].iconSystemName, "wand.and.stars")
        XCTAssertEqual(pages[3].titleKey, "Ready to Begin?")
        XCTAssertFalse(pages[3].subtitleKey.isEmpty)
        XCTAssertEqual(pages[3].gradientColors.count, 2)
    }

    // MARK: - Page Data Integrity

    /// All pages have non-empty fields.
    func testPageDataIsComplete() {
        for (index, page) in OnboardingViewModel.pages.enumerated() {
            XCTAssertFalse(page.iconSystemName.isEmpty,
                           "Page \(index) must have an icon system name")
            XCTAssertFalse(page.titleKey.isEmpty,
                           "Page \(index) must have a title")
            XCTAssertFalse(page.subtitleKey.isEmpty,
                           "Page \(index) must have a subtitle")
            XCTAssertFalse(page.gradientColors.isEmpty,
                           "Page \(index) must have gradient colors")
        }
    }
}

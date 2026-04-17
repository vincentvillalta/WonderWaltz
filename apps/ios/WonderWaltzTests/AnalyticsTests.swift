import XCTest
@testable import WWAnalytics

final class AnalyticsTests: XCTestCase {

    private var service: PostHogAnalyticsService!

    override func setUp() {
        super.setUp()
        service = PostHogAnalyticsService()
    }

    override func tearDown() {
        service = nil
        super.tearDown()
    }

    // MARK: - Forbidden Property Filtering

    func testStripsGuestAgeProperty() {
        let filtered = service.filterProperties([
            "guest_age": "5",
            "valid_key": "ok",
        ])
        XCTAssertNil(filtered["guest_age"], "guest_age should be stripped")
        XCTAssertEqual(
            filtered["valid_key"] as? String, "ok",
            "valid_key should be kept"
        )
    }

    func testStripsAgeBracketProperty() {
        let filtered = service.filterProperties([
            "age_bracket": "5-8",
            "park": "MK",
        ])
        XCTAssertNil(filtered["age_bracket"])
        XCTAssertEqual(filtered["park"] as? String, "MK")
    }

    func testStripsGuestAgeBracketProperty() {
        let filtered = service.filterProperties([
            "guest_age_bracket": "0-2",
        ])
        XCTAssertNil(filtered["guest_age_bracket"])
    }

    func testStripsAgeProperty() {
        let filtered = service.filterProperties(["age": 7])
        XCTAssertNil(filtered["age"])
    }

    func testStripsDobProperty() {
        let filtered = service.filterProperties(["dob": "2020-01-01"])
        XCTAssertNil(filtered["dob"])
    }

    func testStripsBirthdateProperty() {
        let filtered = service.filterProperties(["birthdate": "2020-01-01"])
        XCTAssertNil(filtered["birthdate"])
    }

    func testStripsBirthDateProperty() {
        let filtered = service.filterProperties(["birth_date": "2020-01-01"])
        XCTAssertNil(filtered["birth_date"])
    }

    func testCaseInsensitiveFiltering() {
        let filtered = service.filterProperties([
            "Guest_Age": "5",
            "AGE_BRACKET": "5-8",
            "DOB": "2020-01-01",
        ])
        XCTAssertTrue(
            filtered.isEmpty,
            "All forbidden keys should be stripped regardless of case"
        )
    }

    func testAllSevenForbiddenKeysFiltered() {
        let allForbidden: [String: Any] = [
            "guest_age": "5",
            "age_bracket": "5-8",
            "guest_age_bracket": "0-2",
            "age": 7,
            "dob": "2020-01-01",
            "birthdate": "2020-01-01",
            "birth_date": "2020-01-01",
        ]
        let filtered = service.filterProperties(allForbidden)
        XCTAssertTrue(
            filtered.isEmpty,
            "All 7 forbidden properties should be stripped"
        )
    }

    func testValidPropertiesPreserved() {
        let properties: [String: Any] = [
            "event_name": "trip_created",
            "park_id": "mk",
            "step_count": 3,
            "is_premium": true,
        ]
        let filtered = service.filterProperties(properties)
        XCTAssertEqual(filtered.count, 4, "All valid properties should be kept")
    }

    func testEmptyPropertiesReturnsEmpty() {
        let filtered = service.filterProperties([:])
        XCTAssertTrue(filtered.isEmpty)
    }
}

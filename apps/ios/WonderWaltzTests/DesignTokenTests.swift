import XCTest
import SwiftUI
@testable import WWDesignSystem

final class DesignTokenTests: XCTestCase {

    // MARK: - Color Tokens

    func testNavyColorExists() {
        let color = WWDesignTokens.colorPrimitiveNavy
        XCTAssertNotNil(color, "Navy color token should exist")
    }

    func testCreamColorExists() {
        let color = WWDesignTokens.colorPrimitiveCream
        XCTAssertNotNil(color, "Cream color token should exist")
    }

    func testGoldColorExists() {
        let color = WWDesignTokens.colorPrimitiveGold
        XCTAssertNotNil(color, "Gold color token should exist")
    }

    // MARK: - Theme

    func testThemeBackgroundReturnsColor() {
        let color = WWTheme.background
        XCTAssertNotNil(color, "Theme background should return a valid Color")
    }

    func testThemeTextPrimaryReturnsColor() {
        let color = WWTheme.textPrimary
        XCTAssertNotNil(color, "Theme textPrimary should return a valid Color")
    }

    func testThemeAccentReturnsColor() {
        let color = WWTheme.accent
        XCTAssertNotNil(color, "Theme accent should return a valid Color")
    }

    func testThemeSurfaceReturnsColor() {
        let color = WWTheme.surface
        XCTAssertNotNil(color, "Theme surface should return a valid Color")
    }

    // MARK: - Typography

    func testTypographyTitleReturnsFont() {
        let font = WWTypography.title
        XCTAssertNotNil(font, "Typography title should return a valid Font")
    }

    func testTypographyBodyReturnsFont() {
        let font = WWTypography.body
        XCTAssertNotNil(font, "Typography body should return a valid Font")
    }

    func testTypographyHeadlineReturnsFont() {
        let font = WWTypography.headline
        XCTAssertNotNil(font, "Typography headline should return a valid Font")
    }

    func testTypographyCaptionReturnsFont() {
        let font = WWTypography.caption
        XCTAssertNotNil(font, "Typography caption should return a valid Font")
    }

    // MARK: - Spacing

    func testSpacingTokensExist() {
        XCTAssertEqual(WWDesignTokens.spacing4, 8)
        XCTAssertEqual(WWDesignTokens.spacing8, 16)
        XCTAssertEqual(WWDesignTokens.spacing12, 24)
    }

    // MARK: - Radius

    func testRadiusTokensExist() {
        XCTAssertEqual(WWDesignTokens.radiusBase, 16)
        XCTAssertEqual(WWDesignTokens.radiusMd, 14)
        XCTAssertEqual(WWDesignTokens.radiusSm, 12)
    }
}

import SwiftUI

/// Typography helpers using Fraunces (display) and Inter (UI) fonts.
/// All fonts use `relativeTo:` for Dynamic Type scaling.
///
/// Note: Fraunces and Inter are variable fonts. For v1, we use system
/// font fallbacks when custom fonts are not yet registered. The font
/// registration will be completed when font files are added to the
/// package's resource bundle.
public enum WWTypography {

    // MARK: - Display (Fraunces)

    /// Large title — Fraunces 34pt, relative to .largeTitle.
    public static let largeTitle: Font = .custom(
        WWDesignTokens.fontFamilyDisplay,
        size: 34,
        relativeTo: .largeTitle
    )

    /// Title — Fraunces 28pt, relative to .title.
    public static let title: Font = .custom(
        WWDesignTokens.fontFamilyDisplay,
        size: 28,
        relativeTo: .title
    )

    /// Title 2 — Fraunces 22pt, relative to .title2.
    public static let title2: Font = .custom(
        WWDesignTokens.fontFamilyDisplay,
        size: 22,
        relativeTo: .title2
    )

    /// Title 3 — Fraunces 20pt, relative to .title3.
    public static let title3: Font = .custom(
        WWDesignTokens.fontFamilyDisplay,
        size: 20,
        relativeTo: .title3
    )

    // MARK: - UI (Inter)

    /// Headline — Inter 17pt semibold, relative to .headline.
    public static let headline: Font = .custom(
        WWDesignTokens.fontFamilyUI,
        size: 17,
        relativeTo: .headline
    ).weight(.semibold)

    /// Body — Inter 16pt, relative to .body.
    public static let body: Font = .custom(
        WWDesignTokens.fontFamilyUI,
        size: WWDesignTokens.fontSizeBase,
        relativeTo: .body
    )

    /// Callout — Inter 15pt, relative to .callout.
    public static let callout: Font = .custom(
        WWDesignTokens.fontFamilyUI,
        size: 15,
        relativeTo: .callout
    )

    /// Subheadline — Inter 14pt, relative to .subheadline.
    public static let subheadline: Font = .custom(
        WWDesignTokens.fontFamilyUI,
        size: 14,
        relativeTo: .subheadline
    )

    /// Footnote — Inter 13pt, relative to .footnote.
    public static let footnote: Font = .custom(
        WWDesignTokens.fontFamilyUI,
        size: 13,
        relativeTo: .footnote
    )

    /// Caption — Inter 12pt, relative to .caption.
    public static let caption: Font = .custom(
        WWDesignTokens.fontFamilyUI,
        size: 12,
        relativeTo: .caption
    )

    /// Caption 2 — Inter 11pt, relative to .caption2.
    public static let caption2: Font = .custom(
        WWDesignTokens.fontFamilyUI,
        size: 11,
        relativeTo: .caption2
    )

    // MARK: - Button

    /// Button label — Inter 16pt medium, relative to .body.
    public static let button: Font = .custom(
        WWDesignTokens.fontFamilyUI,
        size: WWDesignTokens.fontSizeBase,
        relativeTo: .body
    ).weight(.medium)
}

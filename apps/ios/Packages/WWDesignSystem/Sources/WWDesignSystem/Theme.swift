import SwiftUI

/// Semantic color helpers for the WonderWaltz theme.
/// v1: Light mode only. Semantic names allow dark mode addition later.
public enum WWTheme {

    // MARK: - Backgrounds

    /// Main app background — cream.
    public static let background = WWDesignTokens.colorSemanticLightBackground

    /// Card/surface background — white.
    public static let surface = WWDesignTokens.colorSemanticLightCard

    /// Muted background for disabled/secondary areas.
    public static let muted = WWDesignTokens.colorSemanticLightMuted

    // MARK: - Text

    /// Primary text color — navy.
    public static let textPrimary = WWDesignTokens.colorSemanticLightForeground

    /// Secondary/muted text color.
    public static let textSecondary = WWDesignTokens.colorSemanticLightMutedFg

    /// Text on primary (navy) backgrounds — white.
    public static let textOnPrimary = WWDesignTokens.colorSemanticLightPrimaryFg

    /// Text on accent (gold) backgrounds — navy.
    public static let textOnAccent = WWDesignTokens.colorSemanticLightAccentFg

    // MARK: - Accent & Brand

    /// Accent color — gold. Decorative/background only, never body text.
    public static let accent = WWDesignTokens.colorPrimitiveGold

    /// Primary brand color — navy.
    public static let primary = WWDesignTokens.colorPrimitiveNavy

    // MARK: - Status

    /// Error/destructive color.
    public static let error = WWDesignTokens.colorSemanticStatusError

    /// Success color.
    public static let success = WWDesignTokens.colorSemanticStatusSuccess

    /// Warning color.
    public static let warning = WWDesignTokens.colorSemanticStatusWarning

    // MARK: - Interactive

    /// Focus ring color — gold.
    public static let ring = WWDesignTokens.colorSemanticLightRing

    /// Destructive action color.
    public static let destructive = WWDesignTokens.colorSemanticLightDestructive
}

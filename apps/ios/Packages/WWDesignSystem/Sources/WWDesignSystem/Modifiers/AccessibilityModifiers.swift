import SwiftUI

// MARK: - Accessible Tap Target

/// Ensures minimum 44x44pt hit area for interactive elements per WCAG 2.2 AA.
/// Expands the tappable region without changing visual layout.
public struct WWAccessibleTapTarget: ViewModifier {

    public func body(content: Content) -> some View {
        content
            .frame(minWidth: WWDesignTokens.iconographyMinTapTarget,
                   minHeight: WWDesignTokens.iconographyMinTapTarget)
            .contentShape(Rectangle())
    }
}

// MARK: - Accessible Hidden

/// Shorthand for hiding decorative elements from VoiceOver.
public struct WWAccessibleHidden: ViewModifier {

    public func body(content: Content) -> some View {
        content
            .accessibilityHidden(true)
    }
}

// MARK: - Accessible Button Label

/// Applies accessibility label and button trait to interactive elements.
public struct WWAccessibleButtonLabel: ViewModifier {

    private let label: LocalizedStringKey

    public init(_ label: LocalizedStringKey) {
        self.label = label
    }

    public func body(content: Content) -> some View {
        content
            .accessibilityLabel(Text(label))
            .accessibilityAddTraits(.isButton)
    }
}

// MARK: - View Extensions

extension View {

    /// Ensures minimum 44x44pt tap target for WCAG 2.2 AA compliance.
    public func wwAccessibleTapTarget() -> some View {
        modifier(WWAccessibleTapTarget())
    }

    /// Hides decorative element from VoiceOver.
    public func wwAccessibleHidden() -> some View {
        modifier(WWAccessibleHidden())
    }

    /// Applies accessibility label and button trait for interactive elements.
    public func wwAccessibilityLabel(_ text: LocalizedStringKey) -> some View {
        modifier(WWAccessibleButtonLabel(text))
    }

    /// Wraps a common accessibility action pattern.
    public func wwAccessibilityAction(
        label: LocalizedStringKey,
        action: @escaping () -> Void
    ) -> some View {
        self
            .accessibilityLabel(Text(label))
            .accessibilityAction(.default, action)
    }
}

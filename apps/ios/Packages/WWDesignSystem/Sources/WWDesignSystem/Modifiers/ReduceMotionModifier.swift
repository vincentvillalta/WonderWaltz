import SwiftUI

// MARK: - Conditional Animation

/// Checks `accessibilityReduceMotion` and suppresses animation when enabled.
/// When reduce motion is ON: `.animation(.none)` for instant transitions.
/// When reduce motion is OFF: `.animation(.spring)` for normal animation.
public struct ConditionalAnimationModifier<V: Equatable>: ViewModifier {

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private let value: V

    public init(value: V) {
        self.value = value
    }

    public func body(content: Content) -> some View {
        content
            .animation(reduceMotion ? .none : .spring, value: value)
    }
}

// MARK: - Conditional Transition

/// Applies a transition only when reduce motion is OFF.
/// When reduce motion is ON: no transition (instant appearance).
public struct ConditionalTransitionModifier: ViewModifier {

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private let transition: AnyTransition

    public init(_ transition: AnyTransition) {
        self.transition = transition
    }

    public func body(content: Content) -> some View {
        if reduceMotion {
            content
        } else {
            content
                .transition(transition)
        }
    }
}

// MARK: - View Extensions

extension View {

    /// Animation that respects reduce motion preference.
    /// - Parameter value: The equatable value that triggers animation.
    /// - When reduce motion ON: instant (no animation).
    /// - When reduce motion OFF: spring animation.
    public func conditionalAnimation<V: Equatable>(value: V) -> some View {
        modifier(ConditionalAnimationModifier(value: value))
    }

    /// Transition that only applies when reduce motion is OFF.
    /// - Parameter transition: The transition to apply conditionally.
    public func wwTransition(_ transition: AnyTransition) -> some View {
        modifier(ConditionalTransitionModifier(transition))
    }
}

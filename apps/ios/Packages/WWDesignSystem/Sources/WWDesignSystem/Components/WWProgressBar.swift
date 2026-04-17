import SwiftUI

/// Horizontal progress bar with gold fill on cream track.
/// Accepts `progress: Double` (0-1) and optional step count.
public struct WWProgressBar: View {

    private let progress: Double
    private let totalSteps: Int?
    private let currentStep: Int?

    /// Create a progress bar.
    /// - Parameters:
    ///   - progress: Progress value from 0.0 to 1.0.
    ///   - totalSteps: Optional total number of steps for step display.
    ///   - currentStep: Optional current step number.
    public init(
        progress: Double,
        totalSteps: Int? = nil,
        currentStep: Int? = nil
    ) {
        self.progress = min(max(progress, 0), 1)
        self.totalSteps = totalSteps
        self.currentStep = currentStep
    }

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public var body: some View {
        VStack(spacing: WWDesignTokens.spacing2) {
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Track
                    RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                        .fill(WWTheme.muted)
                        .frame(height: 6)

                    // Fill
                    RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                        .fill(WWTheme.accent)
                        .frame(
                            width: geometry.size.width * progress,
                            height: 6
                        )
                        .animation(
                            reduceMotion ? .none : .easeInOut(duration: 0.3),
                            value: progress
                        )
                }
            }
            .frame(height: 6)

            if let totalSteps, let currentStep {
                Text("Step \(currentStep) of \(totalSteps)")
                    .font(WWTypography.caption)
                    .foregroundStyle(WWTheme.textSecondary)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityValue(accessibilityValueText)
        .accessibilityAddTraits(.updatesFrequently)
    }

    private var accessibilityValueText: Text {
        if let totalSteps, let currentStep {
            Text("Step \(currentStep) of \(totalSteps)")
        } else {
            Text("\(Int(progress * 100)) percent")
        }
    }
}

#Preview {
    VStack(spacing: 24) {
        WWProgressBar(progress: 0.3)
        WWProgressBar(progress: 0.6, totalSteps: 8, currentStep: 5)
        WWProgressBar(progress: 1.0)
    }
    .padding()
    .background(WWTheme.background)
}

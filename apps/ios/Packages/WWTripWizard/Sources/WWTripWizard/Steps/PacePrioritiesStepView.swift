import SwiftUI
import WWDesignSystem

/// Step 4: Pace & Priorities -- pace slider + must-do attractions by park.
/// Matches TripSetup.tsx currentStep === 3, lines 437-564.
struct PacePrioritiesStepView: View {

    @Bindable var viewModel: WizardViewModel

    var body: some View {
        // Placeholder -- full implementation in Task 2
        Text("Pace & Priorities step")
            .font(WWTypography.body)
            .foregroundStyle(WWTheme.textSecondary)
    }
}

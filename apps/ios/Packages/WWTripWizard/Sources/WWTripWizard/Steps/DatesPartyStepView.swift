import SwiftUI
import WWDesignSystem

/// Step 1: Dates & Party -- combines trip dates + party members.
/// Matches TripSetup.tsx currentStep === 0, lines 96-249.
struct DatesPartyStepView: View {

    @Bindable var viewModel: WizardViewModel

    var body: some View {
        // Placeholder -- full implementation in Task 2
        Text("Dates & Party step")
            .font(WWTypography.body)
            .foregroundStyle(WWTheme.textSecondary)
    }
}

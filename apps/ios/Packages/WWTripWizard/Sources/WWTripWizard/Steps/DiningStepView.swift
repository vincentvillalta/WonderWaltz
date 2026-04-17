import SwiftUI
import WWDesignSystem

/// Step 3: Dining ADRs -- dining suggestions toggle + budget + character dining + reservations.
/// Matches TripSetup.tsx currentStep === 2, lines 345-434.
struct DiningStepView: View {

    @Bindable var viewModel: WizardViewModel

    var body: some View {
        // Placeholder -- full implementation in Task 2
        Text("Dining ADRs step")
            .font(WWTypography.body)
            .foregroundStyle(WWTheme.textSecondary)
    }
}

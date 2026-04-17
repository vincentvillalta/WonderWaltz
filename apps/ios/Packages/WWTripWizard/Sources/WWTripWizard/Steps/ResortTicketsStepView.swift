import SwiftUI
import WWDesignSystem

/// Step 2: Resort & Tickets -- accommodation + resort + park selection + hopper.
/// Matches TripSetup.tsx currentStep === 1, lines 252-342.
struct ResortTicketsStepView: View {

    @Bindable var viewModel: WizardViewModel

    var body: some View {
        // Placeholder -- full implementation in Task 2
        Text("Resort & Tickets step")
            .font(WWTypography.body)
            .foregroundStyle(WWTheme.textSecondary)
    }
}

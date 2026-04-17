import SwiftUI
import WWDesignSystem

/// Step 7: Review all selections and submit.
struct ReviewStepView: View {

    @Bindable var viewModel: WizardViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: WWDesignTokens.spacing8) {
                Text(LocalizedStringKey("Review your trip"))
                    .font(WWTypography.title)
                    .foregroundStyle(WWTheme.textPrimary)
                    .accessibilityAddTraits(.isHeader)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(WWDesignTokens.spacing8)
        }
    }
}

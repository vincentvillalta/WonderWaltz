import SwiftUI
import WWDesignSystem

/// Step 2: Guest details with DAS, mobility, sensory, dietary.
struct GuestsStepView: View {

    @Bindable var viewModel: WizardViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: WWDesignTokens.spacing8) {
                Text(LocalizedStringKey("Who's coming?"))
                    .font(WWTypography.title)
                    .foregroundStyle(WWTheme.textPrimary)
                    .accessibilityAddTraits(.isHeader)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(WWDesignTokens.spacing8)
        }
    }
}

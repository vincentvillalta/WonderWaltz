import SwiftUI
import WWDesignSystem

/// Step 4: Lodging type and transport selection.
struct LodgingStepView: View {

    @Bindable var viewModel: WizardViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: WWDesignTokens.spacing8) {
                Text(LocalizedStringKey("Where are you staying?"))
                    .font(WWTypography.title)
                    .foregroundStyle(WWTheme.textPrimary)
                    .accessibilityAddTraits(.isHeader)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(WWDesignTokens.spacing8)
        }
    }
}

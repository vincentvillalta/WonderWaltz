import SwiftUI
import WWDesignSystem

/// Step 0: Date selection with native DatePicker.
/// Title: "When are you going?"
struct DatesStepView: View {

    @Bindable var viewModel: WizardViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: WWDesignTokens.spacing8) {
                Text(LocalizedStringKey("When are you going?"))
                    .font(WWTypography.title)
                    .foregroundStyle(WWTheme.textPrimary)
                    .accessibilityAddTraits(.isHeader)

                Text(LocalizedStringKey("Pick your travel dates to get started."))
                    .font(WWTypography.body)
                    .foregroundStyle(WWTheme.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(WWDesignTokens.spacing8)
        }
    }
}

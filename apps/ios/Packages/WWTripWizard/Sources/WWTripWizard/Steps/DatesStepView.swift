import SwiftUI
import WWDesignSystem

/// Step 0: Date selection with native DatePicker.
/// Title: "When are you going?"
/// Uses native DatePicker per RESEARCH.md "Don't Hand-Roll" section.
struct DatesStepView: View {

    @Bindable var viewModel: WizardViewModel

    /// Validation: end >= start, dates in the future, max 7 days.
    private var validationMessage: String? {
        if viewModel.endDate < viewModel.startDate {
            return String(
                localized: "End date must be on or after your start date.",
                comment: "Wizard dates validation: end before start"
            )
        }
        if viewModel.startDate < Calendar.current.startOfDay(for: .now) {
            return String(
                localized: "Your trip dates should be in the future.",
                comment: "Wizard dates validation: past date"
            )
        }
        let days = Calendar.current.dateComponents(
            [.day], from: viewModel.startDate, to: viewModel.endDate
        ).day ?? 0
        if days > 7 {
            return String(
                localized: "We currently support trips up to 7 days.",
                comment: "Wizard dates validation: too long"
            )
        }
        return nil
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: WWDesignTokens.spacing10) {
                Text(LocalizedStringKey("When are you going?"))
                    .font(WWTypography.title)
                    .foregroundStyle(WWTheme.textPrimary)
                    .accessibilityAddTraits(.isHeader)

                Text(LocalizedStringKey("Pick your travel dates to get started."))
                    .font(WWTypography.body)
                    .foregroundStyle(WWTheme.textSecondary)

                WWCard {
                    VStack(alignment: .leading, spacing: WWDesignTokens.spacing8) {
                        DatePicker(
                            selection: $viewModel.startDate,
                            in: Date.now...,
                            displayedComponents: .date
                        ) {
                            Text(LocalizedStringKey("Start date"))
                                .font(WWTypography.headline)
                                .foregroundStyle(WWTheme.textPrimary)
                        }
                        .accessibilityLabel(Text("Trip start date"))

                        Divider()

                        DatePicker(
                            selection: $viewModel.endDate,
                            in: viewModel.startDate...,
                            displayedComponents: .date
                        ) {
                            Text(LocalizedStringKey("End date"))
                                .font(WWTypography.headline)
                                .foregroundStyle(WWTheme.textPrimary)
                        }
                        .accessibilityLabel(Text("Trip end date"))
                    }
                }

                if let message = validationMessage {
                    HStack(spacing: WWDesignTokens.spacing2) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(WWTheme.warning)
                        Text(message)
                            .font(WWTypography.footnote)
                            .foregroundStyle(WWTheme.textSecondary)
                    }
                    .accessibilityElement(children: .combine)
                }

                let days = Calendar.current.dateComponents(
                    [.day], from: viewModel.startDate, to: viewModel.endDate
                ).day.map { $0 + 1 } ?? 1

                Text(String(
                    localized: "\(days)-day trip",
                    comment: "Wizard dates: trip duration label"
                ))
                .font(WWTypography.callout)
                .foregroundStyle(WWTheme.accent)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(WWDesignTokens.spacing8)
        }
    }
}

import SwiftUI
import WWDesignSystem

/// Step 7: Review all selections and submit.
/// Title: "Review your trip"
/// Reassuring language per CONTEXT.md: "Like a Disney expert is walking you through it."
struct ReviewStepView: View {

    @Bindable var viewModel: WizardViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: WWDesignTokens.spacing8) {
                Text(LocalizedStringKey("Review your trip"))
                    .font(WWTypography.title)
                    .foregroundStyle(WWTheme.textPrimary)
                    .accessibilityAddTraits(.isHeader)

                Text(LocalizedStringKey("Everything looks great! Here's what we'll use to build your personalized Disney plan."))
                    .font(WWTypography.body)
                    .foregroundStyle(WWTheme.textSecondary)

                // Dates section
                reviewSection(
                    title: String(localized: "Dates", comment: "Review section: dates"),
                    icon: "calendar",
                    step: .dates
                ) {
                    Text(dateRangeText)
                        .font(WWTypography.body)
                        .foregroundStyle(WWTheme.textPrimary)
                }

                // Parks section
                reviewSection(
                    title: String(localized: "Parks", comment: "Review section: parks"),
                    icon: "map",
                    step: .parks
                ) {
                    VStack(alignment: .leading, spacing: WWDesignTokens.spacing1) {
                        if viewModel.selectedParkIds.isEmpty {
                            Text(LocalizedStringKey("No parks selected"))
                                .font(WWTypography.body)
                                .foregroundStyle(WWTheme.error)
                        } else {
                            ForEach(viewModel.selectedParkIds, id: \.self) { parkId in
                                Text(parkDisplayName(for: parkId))
                                    .font(WWTypography.body)
                                    .foregroundStyle(WWTheme.textPrimary)
                            }
                        }
                        if viewModel.hasHopper {
                            Text(LocalizedStringKey("Park Hopper enabled"))
                                .font(WWTypography.footnote)
                                .foregroundStyle(WWTheme.accent)
                        }
                    }
                }

                // Guests section
                reviewSection(
                    title: String(localized: "Guests", comment: "Review section: guests"),
                    icon: "person.2",
                    step: .guests
                ) {
                    VStack(alignment: .leading, spacing: WWDesignTokens.spacing1) {
                        ForEach(viewModel.guests) { guest in
                            HStack(spacing: WWDesignTokens.spacing2) {
                                Text(guest.name.isEmpty ? String(localized: "Guest", comment: "Unnamed guest label") : guest.name)
                                    .font(WWTypography.body)
                                    .foregroundStyle(WWTheme.textPrimary)
                                Text("(\(guest.ageBracket))")
                                    .font(WWTypography.footnote)
                                    .foregroundStyle(WWTheme.textSecondary)
                                if guest.hasDAS {
                                    Text("DAS")
                                        .font(WWTypography.caption)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(WWTheme.accent.opacity(0.2))
                                        .clipShape(Capsule())
                                }
                            }
                        }
                    }
                }

                // Budget section
                reviewSection(
                    title: String(localized: "Budget", comment: "Review section: budget"),
                    icon: "sparkles",
                    step: .budget
                ) {
                    Text(budgetDisplayName)
                        .font(WWTypography.body)
                        .foregroundStyle(WWTheme.textPrimary)
                }

                // Lodging section
                reviewSection(
                    title: String(localized: "Lodging & Transport", comment: "Review section: lodging"),
                    icon: "bed.double",
                    step: .lodging
                ) {
                    VStack(alignment: .leading, spacing: WWDesignTokens.spacing1) {
                        Text(lodgingDisplayName)
                            .font(WWTypography.body)
                            .foregroundStyle(WWTheme.textPrimary)
                        Text(transportDisplayName)
                            .font(WWTypography.footnote)
                            .foregroundStyle(WWTheme.textSecondary)
                    }
                }

                // Must-do rides section
                reviewSection(
                    title: String(localized: "Must-do rides", comment: "Review section: rides"),
                    icon: "figure.roller.coaster",
                    step: .mustDoRides
                ) {
                    if viewModel.mustDoRideIds.isEmpty {
                        Text(LocalizedStringKey("None selected (we'll optimize for variety)"))
                            .font(WWTypography.body)
                            .foregroundStyle(WWTheme.textSecondary)
                    } else {
                        Text(String(
                            localized: "\(viewModel.mustDoRideIds.count) rides selected",
                            comment: "Review: ride count"
                        ))
                        .font(WWTypography.body)
                        .foregroundStyle(WWTheme.textPrimary)
                    }
                }

                // Meals section
                reviewSection(
                    title: String(localized: "Meals", comment: "Review section: meals"),
                    icon: "fork.knife",
                    step: .mealPrefs
                ) {
                    if viewModel.mealPreferences.isEmpty {
                        Text(LocalizedStringKey("No preference (we'll include meal breaks)"))
                            .font(WWTypography.body)
                            .foregroundStyle(WWTheme.textSecondary)
                    } else {
                        Text(mealSummary)
                            .font(WWTypography.body)
                            .foregroundStyle(WWTheme.textPrimary)
                    }
                }

                // Error message
                if let error = viewModel.submissionError {
                    HStack(spacing: WWDesignTokens.spacing2) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(WWTheme.error)
                        Text(error)
                            .font(WWTypography.footnote)
                            .foregroundStyle(WWTheme.error)
                    }
                    .padding(WWDesignTokens.spacing4)
                    .background(WWTheme.error.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(WWDesignTokens.spacing8)
        }
    }

    // MARK: - Review Section

    @ViewBuilder
    private func reviewSection<Content: View>(
        title: String,
        icon: String,
        step: WizardStep,
        @ViewBuilder content: () -> Content
    ) -> some View {
        Button {
            Task {
                // Navigate back to the step to edit
                viewModel.currentStep = step
            }
        } label: {
            WWCard {
                VStack(alignment: .leading, spacing: WWDesignTokens.spacing4) {
                    HStack {
                        Image(systemName: icon)
                            .font(.body)
                            .foregroundStyle(WWTheme.accent)

                        Text(title)
                            .font(WWTypography.headline)
                            .foregroundStyle(WWTheme.textPrimary)

                        Spacer()

                        Image(systemName: "pencil")
                            .font(.caption)
                            .foregroundStyle(WWTheme.textSecondary)
                    }

                    content()
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text("Edit \(title)"))
        .accessibilityHint(Text("Tap to go back and change this section"))
    }

    // MARK: - Display Helpers

    private var dateRangeText: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return "\(formatter.string(from: viewModel.startDate)) - \(formatter.string(from: viewModel.endDate))"
    }

    private func parkDisplayName(for id: String) -> String {
        switch id {
        case "magic-kingdom": return "Magic Kingdom"
        case "epcot": return "EPCOT"
        case "hollywood-studios": return "Hollywood Studios"
        case "animal-kingdom": return "Animal Kingdom"
        default: return id
        }
    }

    private var budgetDisplayName: String {
        switch viewModel.budgetTier {
        case "value": return String(localized: "Pixie Dust (value)", comment: "Budget tier display")
        case "moderate": return String(localized: "Fairy Tale (moderate)", comment: "Budget tier display")
        case "premium": return String(localized: "Royal Treatment (premium)", comment: "Budget tier display")
        default: return String(localized: "Not selected", comment: "Budget not set")
        }
    }

    private var lodgingDisplayName: String {
        switch viewModel.lodgingType {
        case "value": return String(localized: "On-property Value", comment: "Lodging display")
        case "moderate": return String(localized: "On-property Moderate", comment: "Lodging display")
        case "deluxe": return String(localized: "On-property Deluxe", comment: "Lodging display")
        case "deluxe-villa": return String(localized: "On-property Deluxe Villa", comment: "Lodging display")
        case "off-property": return String(localized: "Off-property", comment: "Lodging display")
        case "day-visitor": return String(localized: "Day visitor", comment: "Lodging display")
        default: return String(localized: "Not selected", comment: "Lodging not set")
        }
    }

    private var transportDisplayName: String {
        switch viewModel.transportType {
        case "car": return String(localized: "Getting around by car", comment: "Transport display")
        case "bus": return String(localized: "Disney transport (bus)", comment: "Transport display")
        case "rideshare": return String(localized: "Rideshare", comment: "Transport display")
        default: return String(localized: "Transport not set", comment: "Transport not set")
        }
    }

    private var mealSummary: String {
        var parts: [String] = []
        for pref in viewModel.mealPreferences {
            switch pref {
            case "table-service": parts.append(String(localized: "Table service", comment: "Meal summary"))
            case "quick-service": parts.append(String(localized: "Quick service", comment: "Meal summary"))
            case "mix": parts.append(String(localized: "Mix of both", comment: "Meal summary"))
            default:
                if pref.hasPrefix("pin:") {
                    parts.append(String(pref.dropFirst(4)))
                }
            }
        }
        return parts.joined(separator: ", ")
    }
}

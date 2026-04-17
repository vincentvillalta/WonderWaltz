import SwiftUI
import WWDesignSystem

/// Step 6: Meal preferences selection.
/// Title: "Meal preferences"
/// Captures dining style, table-service count, and pinned reservations.
struct MealPrefsStepView: View {

    @Bindable var viewModel: WizardViewModel
    @State private var pinnedDining: String = ""

    /// Meal style options.
    private static let mealStyles: [(id: String, label: String, description: String, icon: String)] = [
        ("table-service", "Table service", "Sit-down restaurants with reservations", "fork.knife"),
        ("quick-service", "Quick service", "Counter service, grab-and-go", "takeoutbag.and.cup.and.straw"),
        ("mix", "Mix of both", "Some sit-down, some quick", "list.bullet"),
    ]

    /// Number of table-service meals per day options.
    private static let tableServiceCounts = [0, 1, 2]

    /// Current meal style selection.
    private var currentMealStyle: String? {
        viewModel.mealPreferences.first { pref in
            Self.mealStyles.contains { $0.id == pref }
        }
    }

    /// Current table service count.
    private var tableServiceCount: Int {
        for pref in viewModel.mealPreferences {
            if pref.hasPrefix("ts-count-"), let count = Int(pref.replacingOccurrences(of: "ts-count-", with: "")) {
                return count
            }
        }
        return 0
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: WWDesignTokens.spacing10) {
                Text(LocalizedStringKey("Meal preferences"))
                    .font(WWTypography.title)
                    .foregroundStyle(WWTheme.textPrimary)
                    .accessibilityAddTraits(.isHeader)

                Text(LocalizedStringKey("Tell us how you'd like to eat in the parks."))
                    .font(WWTypography.body)
                    .foregroundStyle(WWTheme.textSecondary)

                // Meal style selection
                Text(LocalizedStringKey("Dining style"))
                    .font(WWTypography.headline)
                    .foregroundStyle(WWTheme.textPrimary)

                ForEach(Self.mealStyles, id: \.id) { style in
                    mealStyleCard(style: style)
                }

                // Table service count
                if currentMealStyle == "table-service" || currentMealStyle == "mix" {
                    VStack(alignment: .leading, spacing: WWDesignTokens.spacing4) {
                        Text(LocalizedStringKey("Table-service meals per day"))
                            .font(WWTypography.headline)
                            .foregroundStyle(WWTheme.textPrimary)

                        Picker(
                            String(localized: "Meals per day", comment: "Table service count picker"),
                            selection: Binding(
                                get: { tableServiceCount },
                                set: { newValue in setTableServiceCount(newValue) }
                            )
                        ) {
                            ForEach(Self.tableServiceCounts, id: \.self) { count in
                                Text("\(count)").tag(count)
                            }
                        }
                        .pickerStyle(.segmented)
                        .accessibilityLabel(Text("Table-service meals per day"))
                    }
                    .padding(.top, WWDesignTokens.spacing4)
                }

                // Pinned dining reservations
                VStack(alignment: .leading, spacing: WWDesignTokens.spacing4) {
                    Text(LocalizedStringKey("Specific restaurants (optional)"))
                        .font(WWTypography.headline)
                        .foregroundStyle(WWTheme.textPrimary)

                    Text(LocalizedStringKey("Any restaurants you've already booked or really want to visit?"))
                        .font(WWTypography.footnote)
                        .foregroundStyle(WWTheme.textSecondary)

                    HStack {
                        TextField(
                            String(localized: "e.g. Be Our Guest", comment: "Pinned dining placeholder"),
                            text: $pinnedDining
                        )
                        .font(WWTypography.body)
                        .textFieldStyle(.roundedBorder)
                        .accessibilityLabel(Text("Restaurant name"))

                        Button {
                            guard !pinnedDining.trimmingCharacters(in: .whitespaces).isEmpty else { return }
                            let pref = "pin:\(pinnedDining.trimmingCharacters(in: .whitespaces))"
                            if !viewModel.mealPreferences.contains(pref) {
                                viewModel.mealPreferences.append(pref)
                            }
                            pinnedDining = ""
                        } label: {
                            Image(systemName: "plus.circle.fill")
                                .font(.title2)
                                .foregroundStyle(WWTheme.accent)
                                .frame(
                                    minWidth: WWDesignTokens.iconographyMinTapTarget,
                                    minHeight: WWDesignTokens.iconographyMinTapTarget
                                )
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(Text("Add restaurant"))
                    }

                    // Show pinned restaurants
                    let pinned = viewModel.mealPreferences.filter { $0.hasPrefix("pin:") }
                    if !pinned.isEmpty {
                        FlowLayout(spacing: WWDesignTokens.spacing2) {
                            ForEach(pinned, id: \.self) { pref in
                                let name = String(pref.dropFirst(4))
                                Button {
                                    viewModel.mealPreferences.removeAll { $0 == pref }
                                } label: {
                                    HStack(spacing: WWDesignTokens.spacing1) {
                                        Text(name)
                                            .font(WWTypography.caption)
                                            .lineLimit(1)
                                        Image(systemName: "xmark")
                                            .font(.caption2)
                                    }
                                    .padding(.horizontal, WWDesignTokens.spacing4)
                                    .padding(.vertical, WWDesignTokens.spacing2)
                                    .background(WWTheme.accent.opacity(0.2))
                                    .foregroundStyle(WWTheme.primary)
                                    .clipShape(Capsule())
                                }
                                .buttonStyle(.plain)
                                .frame(minHeight: WWDesignTokens.iconographyMinTapTarget)
                                .accessibilityLabel(Text("Remove \(name)"))
                                .accessibilityAddTraits(.isButton)
                            }
                        }
                    }
                }
                .padding(.top, WWDesignTokens.spacing4)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(WWDesignTokens.spacing8)
        }
    }

    // MARK: - Meal Style Card

    @ViewBuilder
    private func mealStyleCard(style: (id: String, label: String, description: String, icon: String)) -> some View {
        let isSelected = currentMealStyle == style.id

        Button {
            setMealStyle(style.id)
        } label: {
            HStack(spacing: WWDesignTokens.spacing4) {
                Image(systemName: style.icon)
                    .font(.title2)
                    .foregroundStyle(isSelected ? WWTheme.accent : WWTheme.textSecondary)
                    .frame(width: 36)

                VStack(alignment: .leading, spacing: 2) {
                    Text(LocalizedStringKey(style.label))
                        .font(WWTypography.subheadline)
                        .foregroundStyle(WWTheme.textPrimary)
                    Text(LocalizedStringKey(style.description))
                        .font(WWTypography.caption)
                        .foregroundStyle(WWTheme.textSecondary)
                }

                Spacer()

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isSelected ? WWTheme.accent : WWTheme.textSecondary)
                    .font(.title3)
            }
            .padding(WWDesignTokens.spacing4)
            .frame(minHeight: WWDesignTokens.iconographyMinTapTarget)
            .background(isSelected ? WWTheme.accent.opacity(0.06) : .clear)
            .clipShape(RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text("\(style.label): \(style.description)"))
        .accessibilityValue(Text(isSelected ? "Selected" : "Not selected"))
        .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : [.isButton])
    }

    // MARK: - Helpers

    private func setMealStyle(_ style: String) {
        // Remove old meal style
        viewModel.mealPreferences.removeAll { pref in
            Self.mealStyles.contains { $0.id == pref }
        }
        viewModel.mealPreferences.insert(style, at: 0)
    }

    private func setTableServiceCount(_ count: Int) {
        viewModel.mealPreferences.removeAll { $0.hasPrefix("ts-count-") }
        viewModel.mealPreferences.append("ts-count-\(count)")
    }
}

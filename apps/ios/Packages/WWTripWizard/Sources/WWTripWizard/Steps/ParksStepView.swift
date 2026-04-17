import SwiftUI
import WWDesignSystem

/// Step 1: Park selection with hopper toggle.
/// Title: "Which parks?"
/// Grid of 4 park cards with selectable state + Park Hopper toggle.
struct ParksStepView: View {

    @Bindable var viewModel: WizardViewModel

    /// The 4 WDW parks with display info.
    private static let parks: [(id: String, name: String, icon: String)] = [
        ("magic-kingdom", "Magic Kingdom", "sparkles"),
        ("epcot", "EPCOT", "globe.americas"),
        ("hollywood-studios", "Hollywood Studios", "film"),
        ("animal-kingdom", "Animal Kingdom", "leaf"),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: WWDesignTokens.spacing10) {
                Text(LocalizedStringKey("Which parks?"))
                    .font(WWTypography.title)
                    .foregroundStyle(WWTheme.textPrimary)
                    .accessibilityAddTraits(.isHeader)

                Text(LocalizedStringKey("Select the parks you want to visit."))
                    .font(WWTypography.body)
                    .foregroundStyle(WWTheme.textSecondary)

                // Park grid
                LazyVGrid(
                    columns: [
                        GridItem(.flexible(), spacing: WWDesignTokens.spacing4),
                        GridItem(.flexible(), spacing: WWDesignTokens.spacing4),
                    ],
                    spacing: WWDesignTokens.spacing4
                ) {
                    ForEach(Self.parks, id: \.id) { park in
                        parkCard(park: park)
                    }
                }

                // Hopper toggle
                WWCard {
                    Toggle(isOn: $viewModel.hasHopper) {
                        VStack(alignment: .leading, spacing: WWDesignTokens.spacing1) {
                            Text(LocalizedStringKey("Park Hopper"))
                                .font(WWTypography.headline)
                                .foregroundStyle(WWTheme.textPrimary)
                            Text(LocalizedStringKey("Visit multiple parks in one day"))
                                .font(WWTypography.footnote)
                                .foregroundStyle(WWTheme.textSecondary)
                        }
                    }
                    .tint(WWTheme.accent)
                    .accessibilityLabel(Text("Park Hopper pass"))
                    .accessibilityHint(Text("Allows visiting multiple parks in one day"))
                }

                if viewModel.selectedParkIds.isEmpty {
                    Text(LocalizedStringKey("Please select at least one park."))
                        .font(WWTypography.footnote)
                        .foregroundStyle(WWTheme.textSecondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(WWDesignTokens.spacing8)
        }
    }

    // MARK: - Park Card

    @ViewBuilder
    private func parkCard(park: (id: String, name: String, icon: String)) -> some View {
        let isSelected = viewModel.selectedParkIds.contains(park.id)

        Button {
            if isSelected {
                viewModel.selectedParkIds.removeAll { $0 == park.id }
            } else {
                viewModel.selectedParkIds.append(park.id)
            }
        } label: {
            VStack(spacing: WWDesignTokens.spacing4) {
                Image(systemName: park.icon)
                    .font(.system(size: 28))
                    .foregroundStyle(isSelected ? WWTheme.accent : WWTheme.textSecondary)

                Text(LocalizedStringKey(park.name))
                    .font(WWTypography.subheadline)
                    .foregroundStyle(WWTheme.textPrimary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity)
            .frame(minHeight: 100)
            .padding(WWDesignTokens.spacing4)
            .background(WWTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: WWDesignTokens.radiusLg))
            .overlay(
                RoundedRectangle(cornerRadius: WWDesignTokens.radiusLg)
                    .strokeBorder(
                        isSelected ? WWTheme.accent : WWTheme.muted,
                        lineWidth: isSelected ? 2.5 : 1
                    )
            )
            .shadow(
                color: WWTheme.primary.opacity(isSelected ? 0.12 : 0.04),
                radius: isSelected ? 8 : 4,
                x: 0, y: 2
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text(park.name))
        .accessibilityValue(Text(isSelected ? "Selected" : "Not selected"))
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}

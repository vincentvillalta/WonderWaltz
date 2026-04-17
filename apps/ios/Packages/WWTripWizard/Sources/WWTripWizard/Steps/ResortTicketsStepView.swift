import SwiftUI
import WWDesignSystem

/// Step 2: Resort & Tickets -- accommodation + resort + park selection + hopper.
/// Matches TripSetup.tsx currentStep === 1, lines 252-342.
///
/// Layout:
/// - Accommodation type: 3 radio options with gold border on selected
/// - Resort selector: conditional dropdown when Disney Resort selected
/// - Park selector: 2x2 grid with emoji + park-color highlight
/// - Park Hopper toggle
struct ResortTicketsStepView: View {

    @Bindable var viewModel: WizardViewModel

    /// Disney resort options grouped by tier.
    private let resortGroups: [(tier: String, resorts: [String])] = [
        ("Deluxe Resorts", [
            "Polynesian Village Resort",
            "Grand Floridian Resort & Spa",
            "Contemporary Resort",
            "Animal Kingdom Lodge",
            "Beach Club Resort",
            "Yacht Club Resort"
        ]),
        ("Moderate Resorts", [
            "Port Orleans - French Quarter",
            "Port Orleans - Riverside",
            "Caribbean Beach Resort",
            "Coronado Springs Resort"
        ]),
        ("Value Resorts", [
            "Pop Century Resort",
            "All-Star Movies Resort",
            "All-Star Sports Resort",
            "Art of Animation Resort"
        ])
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing10) {
            // Accommodation type radio group
            accommodationSection

            // Resort selector (conditional)
            if viewModel.accommodationType == .disneyResort {
                resortSelector
            }

            // Park selector 2x2 grid
            parkSelector

            // Park Hopper toggle
            hopperToggle
        }
    }

    // MARK: - Accommodation (lines 254-280)

    private var accommodationSection: some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing6) {
            Text("Where are you staying?")
                .font(WWTypography.subheadline)
                .foregroundStyle(WWTheme.textSecondary)

            ForEach(AccommodationType.allCases, id: \.self) { type in
                accommodationRadioCard(type: type)
            }
        }
    }

    private func accommodationRadioCard(
        type: AccommodationType
    ) -> some View {
        let isSelected = viewModel.accommodationType == type
        return Button {
            viewModel.accommodationType = type
        } label: {
            HStack(spacing: WWDesignTokens.spacing6) {
                // Radio circle
                Circle()
                    .strokeBorder(
                        isSelected ? WWTheme.accent : WWTheme.border,
                        lineWidth: isSelected ? 2 : 1.5
                    )
                    .frame(width: 20, height: 20)
                    .overlay(
                        Circle()
                            .fill(isSelected ? WWTheme.primary : .clear)
                            .frame(width: 10, height: 10)
                    )

                VStack(alignment: .leading, spacing: 2) {
                    Text(type.displayTitle)
                        .font(WWTypography.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(WWTheme.textPrimary)
                    Text(type.displaySubtitle)
                        .font(WWTypography.caption)
                        .foregroundStyle(WWTheme.textSecondary)
                }

                Spacer()
            }
            .padding(WWDesignTokens.spacing6)
            .background(WWTheme.surface)
            .clipShape(
                RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
            )
            .overlay(
                RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                    .stroke(
                        isSelected ? WWTheme.accent : WWTheme.border,
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    // MARK: - Resort Selector (lines 282-308)

    private var resortSelector: some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing4) {
            Text("Select Your Resort")
                .font(WWTypography.subheadline)
                .foregroundStyle(WWTheme.textSecondary)

            Picker("Resort", selection: Binding(
                get: { viewModel.selectedResort ?? "" },
                set: { viewModel.selectedResort = $0.isEmpty ? nil : $0 }
            )) {
                Text("Choose a resort...").tag("")
                ForEach(resortGroups, id: \.tier) { group in
                    Section(header: Text(group.tier)) {
                        ForEach(group.resorts, id: \.self) { resort in
                            Text(resort).tag(resort)
                        }
                    }
                }
            }
            .font(WWTypography.subheadline)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(height: 44)
            .tint(WWTheme.textPrimary)
        }
        .padding(WWDesignTokens.spacing8)
        .background(WWTheme.surface)
        .clipShape(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
        )
        .overlay(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                .stroke(WWTheme.border, lineWidth: 1)
        )
    }

    // MARK: - Park Selector 2x2 Grid (lines 310-332)

    private var parkSelector: some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing6) {
            Text("Which parks will you visit?")
                .font(WWTypography.subheadline)
                .foregroundStyle(WWTheme.textSecondary)

            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: WWDesignTokens.spacing4),
                    GridItem(.flexible(), spacing: WWDesignTokens.spacing4)
                ],
                spacing: WWDesignTokens.spacing4
            ) {
                ForEach(ParkColor.allCases, id: \.self) { park in
                    parkCard(park: park)
                }
            }
        }
    }

    private func parkCard(park: ParkColor) -> some View {
        let parkId = park.shortName.lowercased()
        let isSelected = viewModel.selectedParkIds.contains(parkId)

        return Button {
            if isSelected {
                viewModel.selectedParkIds.removeAll { $0 == parkId }
            } else {
                viewModel.selectedParkIds.append(parkId)
            }
        } label: {
            VStack(spacing: WWDesignTokens.spacing2) {
                Text(park.emoji)
                    .font(.system(size: 28))
                Text(park.displayName)
                    .font(WWTypography.caption)
                    .foregroundStyle(WWTheme.textPrimary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .padding(.horizontal, 4)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 96) // h-24 = 96pt
            .background(
                isSelected
                    ? park.color.opacity(0.08)
                    : WWTheme.surface
            )
            .clipShape(
                RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
            )
            .overlay(
                RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                    .stroke(
                        isSelected ? park.color : WWTheme.border,
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text(park.displayName))
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    // MARK: - Park Hopper Toggle (lines 334-341)

    private var hopperToggle: some View {
        HStack(spacing: WWDesignTokens.spacing6) {
            Toggle(isOn: $viewModel.hasHopper) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Park Hopper")
                        .font(WWTypography.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(WWTheme.textPrimary)
                    Text("Visit multiple parks per day")
                        .font(WWTypography.caption)
                        .foregroundStyle(WWTheme.textSecondary)
                }
            }
            .toggleStyle(.switch)
            .tint(WWTheme.primary)
        }
        .padding(WWDesignTokens.spacing8)
        .background(WWTheme.surface)
        .clipShape(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
        )
        .overlay(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                .stroke(WWTheme.border, lineWidth: 1)
        )
    }
}

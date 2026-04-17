import SwiftUI
import WWDesignSystem

/// Step 4: Pace & Priorities -- pace slider + must-do attractions by park.
/// Matches TripSetup.tsx currentStep === 3, lines 437-564.
///
/// Layout:
/// - Pace slider (0-100) with gold thumb, emoji labels
/// - Must-do attractions grouped by park with park-colored headers
struct PacePrioritiesStepView: View {

    @Bindable var viewModel: WizardViewModel

    /// Must-do attractions grouped by park, matching TripSetup.tsx.
    private let attractionsByPark: [(park: ParkColor, attractions: [String])] = [
        (.magicKingdom, [
            "Seven Dwarfs Mine Train",
            "Space Mountain",
            "Big Thunder Mountain",
            "Haunted Mansion",
            "Pirates of the Caribbean"
        ]),
        (.epcot, [
            "Guardians of the Galaxy",
            "Test Track",
            "Soarin'",
            "Frozen Ever After"
        ]),
        (.hollywoodStudios, [
            "Rise of the Resistance",
            "Slinky Dog Dash",
            "Tower of Terror",
            "Rock 'n' Roller Coaster"
        ]),
        (.animalKingdom, [
            "Flight of Passage",
            "Expedition Everest",
            "Kilimanjaro Safaris",
            "Na'vi River Journey"
        ])
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing10) {
            // Pace slider
            paceSliderSection

            // Must-do attractions
            mustDoSection
        }
    }

    // MARK: - Pace Slider (lines 439-464)

    private var paceSliderSection: some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing6) {
            Text("Your Pace")
                .font(WWTypography.subheadline)
                .foregroundStyle(WWTheme.textSecondary)

            VStack(spacing: WWDesignTokens.spacing6) {
                Slider(
                    value: $viewModel.paceValue,
                    in: 0...100,
                    step: 1
                )
                .tint(WWTheme.accent)
                .accessibilityLabel(Text("Trip pace"))
                .accessibilityValue(Text(paceAccessibilityLabel))

                // 3 labels below slider
                HStack {
                    // Chill
                    VStack(spacing: 2) {
                        Text("\u{1F60C} Chill")
                            .font(WWTypography.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(WWTheme.textPrimary)
                        Text("Lots of breaks")
                            .font(WWTypography.caption)
                            .foregroundStyle(WWTheme.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    // Balanced
                    VStack(spacing: 2) {
                        Text("\u{26A1} Balanced")
                            .font(WWTypography.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(WWTheme.textPrimary)
                        Text("Mix of both")
                            .font(WWTypography.caption)
                            .foregroundStyle(WWTheme.textSecondary)
                    }
                    .frame(maxWidth: .infinity)

                    // Commando
                    VStack(spacing: 2) {
                        Text("\u{1F680} Commando")
                            .font(WWTypography.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(WWTheme.textPrimary)
                        Text("Max rides")
                            .font(WWTypography.caption)
                            .foregroundStyle(WWTheme.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .trailing)
                }
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

    private var paceAccessibilityLabel: String {
        if viewModel.paceValue < 33 {
            return "Chill pace"
        } else if viewModel.paceValue < 67 {
            return "Balanced pace"
        } else {
            return "Commando pace"
        }
    }

    // MARK: - Must-Do Attractions (lines 467-564)

    private var mustDoSection: some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing6) {
            Text("Must-Do Attractions")
                .font(WWTypography.subheadline)
                .foregroundStyle(WWTheme.textSecondary)

            Text("Select rides you absolutely don't want to miss")
                .font(WWTypography.caption)
                .foregroundStyle(WWTheme.textSecondary)
                .padding(.leading, 2)

            ForEach(attractionsByPark, id: \.park) { group in
                parkAttractionGroup(
                    park: group.park,
                    attractions: group.attractions
                )
            }
        }
    }

    private func parkAttractionGroup(
        park: ParkColor,
        attractions: [String]
    ) -> some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing3) {
            // Park header: emoji in tinted container + park name
            HStack(spacing: WWDesignTokens.spacing4) {
                Text(park.emoji)
                    .font(.system(size: 14))
                    .frame(width: 24, height: 24)
                    .background(park.color.opacity(0.12))
                    .clipShape(
                        RoundedRectangle(cornerRadius: 6)
                    )

                Text(park.displayName)
                    .font(WWTypography.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(park.color)
            }
            .padding(.leading, 2)

            // Attraction list
            ForEach(attractions, id: \.self) { attraction in
                attractionRow(
                    attraction: attraction,
                    parkColor: park
                )
            }
        }
        .padding(.bottom, WWDesignTokens.spacing4)
    }

    private func attractionRow(
        attraction: String,
        parkColor: ParkColor
    ) -> some View {
        let isSelected = viewModel.mustDoRideIds.contains(attraction)

        return Button {
            if isSelected {
                viewModel.mustDoRideIds.removeAll { $0 == attraction }
            } else {
                viewModel.mustDoRideIds.append(attraction)
            }
        } label: {
            HStack(spacing: WWDesignTokens.spacing6) {
                // Checkbox
                RoundedRectangle(cornerRadius: 4)
                    .strokeBorder(
                        isSelected ? WWTheme.primary : WWTheme.border,
                        lineWidth: isSelected ? 2 : 1.5
                    )
                    .frame(width: 16, height: 16)
                    .overlay(
                        Group {
                            if isSelected {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(WWTheme.primary)
                            }
                        }
                    )

                Text(attraction)
                    .font(WWTypography.subheadline)
                    .foregroundStyle(WWTheme.textPrimary)

                Spacer()
            }
            .frame(height: 40) // h-10 = 40pt
            .padding(.horizontal, WWDesignTokens.spacing6)
            .background(WWTheme.surface)
            .clipShape(
                RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm - 4)
            )
            .overlay(
                RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm - 4)
                    .stroke(WWTheme.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text(attraction))
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}

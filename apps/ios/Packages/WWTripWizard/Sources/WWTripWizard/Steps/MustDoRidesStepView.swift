import SwiftUI
import WWDesignSystem

/// Step 5: Must-do rides selection from cached catalog.
/// Title: "Must-do rides"
/// Searchable list grouped by park with chip selection at top.
struct MustDoRidesStepView: View {

    @Bindable var viewModel: WizardViewModel
    @State private var searchText: String = ""

    /// Static attraction catalog for wizard selection.
    /// In production, this would be loaded from OfflineStore cached catalog.
    /// Grouped by park with section headers.
    private static let attractionsByPark: [(park: String, parkId: String, attractions: [(id: String, name: String)])] = [
        ("Magic Kingdom", "magic-kingdom", [
            ("mk-space-mountain", "Space Mountain"),
            ("mk-big-thunder", "Big Thunder Mountain Railroad"),
            ("mk-pirates", "Pirates of the Caribbean"),
            ("mk-haunted-mansion", "Haunted Mansion"),
            ("mk-seven-dwarfs", "Seven Dwarfs Mine Train"),
            ("mk-splash-mountain", "Tiana's Bayou Adventure"),
            ("mk-jungle-cruise", "Jungle Cruise"),
            ("mk-buzz-lightyear", "Buzz Lightyear's Space Ranger Spin"),
            ("mk-tron", "TRON Lightcycle Run"),
            ("mk-peter-pan", "Peter Pan's Flight"),
            ("mk-its-a-small-world", "it's a small world"),
        ]),
        ("EPCOT", "epcot", [
            ("ep-test-track", "Test Track"),
            ("ep-frozen-ever-after", "Frozen Ever After"),
            ("ep-guardians", "Guardians of the Galaxy: Cosmic Rewind"),
            ("ep-remy", "Remy's Ratatouille Adventure"),
            ("ep-soarin", "Soarin' Around the World"),
            ("ep-spaceship-earth", "Spaceship Earth"),
            ("ep-living-with-the-land", "Living with the Land"),
        ]),
        ("Hollywood Studios", "hollywood-studios", [
            ("hs-rise-of-resistance", "Rise of the Resistance"),
            ("hs-smugglers-run", "Millennium Falcon: Smugglers Run"),
            ("hs-tower-of-terror", "Tower of Terror"),
            ("hs-rock-n-roller", "Rock 'n' Roller Coaster"),
            ("hs-slinky-dog", "Slinky Dog Dash"),
            ("hs-mickey-minnie-runaway", "Mickey & Minnie's Runaway Railway"),
            ("hs-alien-swirling", "Alien Swirling Saucers"),
        ]),
        ("Animal Kingdom", "animal-kingdom", [
            ("ak-flight-of-passage", "Avatar Flight of Passage"),
            ("ak-navi-river", "Na'vi River Journey"),
            ("ak-kilimanjaro", "Kilimanjaro Safaris"),
            ("ak-expedition-everest", "Expedition Everest"),
            ("ak-dinosaur", "DINOSAUR"),
            ("ak-kali-river", "Kali River Rapids"),
        ]),
    ]

    /// Filtered attractions based on search text.
    private var filteredParks: [(park: String, parkId: String, attractions: [(id: String, name: String)])] {
        if searchText.isEmpty { return Self.attractionsByPark }
        return Self.attractionsByPark.compactMap { section in
            let filtered = section.attractions.filter {
                $0.name.localizedCaseInsensitiveContains(searchText)
            }
            if filtered.isEmpty { return nil }
            return (section.park, section.parkId, filtered)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(alignment: .leading, spacing: WWDesignTokens.spacing4) {
                Text(LocalizedStringKey("Must-do rides"))
                    .font(WWTypography.title)
                    .foregroundStyle(WWTheme.textPrimary)
                    .accessibilityAddTraits(.isHeader)

                Text(LocalizedStringKey("Select the rides you absolutely can't miss. We'll prioritize these in your plan."))
                    .font(WWTypography.body)
                    .foregroundStyle(WWTheme.textSecondary)

                // Selected chips
                if !viewModel.mustDoRideIds.isEmpty {
                    selectedChips
                }

                // Search field
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(WWTheme.textSecondary)
                    TextField(
                        String(localized: "Search rides...", comment: "Ride search placeholder"),
                        text: $searchText
                    )
                    .font(WWTypography.body)
                    if !searchText.isEmpty {
                        Button {
                            searchText = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(WWTheme.textSecondary)
                                .frame(
                                    minWidth: WWDesignTokens.iconographyMinTapTarget,
                                    minHeight: WWDesignTokens.iconographyMinTapTarget
                                )
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(Text("Clear search"))
                    }
                }
                .padding(.horizontal, WWDesignTokens.spacing4)
                .padding(.vertical, WWDesignTokens.spacing2)
                .background(WWTheme.muted.opacity(0.5))
                .clipShape(RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm))
            }
            .padding(.horizontal, WWDesignTokens.spacing8)
            .padding(.top, WWDesignTokens.spacing4)

            // Attraction list
            List {
                ForEach(filteredParks, id: \.parkId) { section in
                    Section {
                        ForEach(section.attractions, id: \.id) { attraction in
                            attractionRow(attraction: attraction)
                        }
                    } header: {
                        Text(section.park)
                            .font(WWTypography.subheadline)
                            .foregroundStyle(WWTheme.textSecondary)
                    }
                }
            }
            .listStyle(.plain)
        }
    }

    // MARK: - Selected Chips

    private var selectedChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: WWDesignTokens.spacing2) {
                ForEach(viewModel.mustDoRideIds, id: \.self) { rideId in
                    if let name = rideName(for: rideId) {
                        Button {
                            viewModel.mustDoRideIds.removeAll { $0 == rideId }
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
                        .accessibilityLabel(Text("Remove \(name)"))
                    }
                }
            }
        }
    }

    // MARK: - Attraction Row

    @ViewBuilder
    private func attractionRow(attraction: (id: String, name: String)) -> some View {
        let isSelected = viewModel.mustDoRideIds.contains(attraction.id)

        Button {
            if isSelected {
                viewModel.mustDoRideIds.removeAll { $0 == attraction.id }
            } else {
                viewModel.mustDoRideIds.append(attraction.id)
            }
        } label: {
            HStack {
                Text(attraction.name)
                    .font(WWTypography.body)
                    .foregroundStyle(WWTheme.textPrimary)

                Spacer()

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isSelected ? WWTheme.accent : WWTheme.textSecondary)
                    .font(.title3)
            }
            .frame(minHeight: WWDesignTokens.iconographyMinTapTarget)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .listRowBackground(isSelected ? WWTheme.accent.opacity(0.06) : Color.clear)
        .accessibilityLabel(Text(attraction.name))
        .accessibilityValue(Text(isSelected ? "Selected as must-do" : "Not selected"))
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    // MARK: - Helpers

    private func rideName(for id: String) -> String? {
        for section in Self.attractionsByPark {
            if let attraction = section.attractions.first(where: { $0.id == id }) {
                return attraction.name
            }
        }
        return nil
    }
}

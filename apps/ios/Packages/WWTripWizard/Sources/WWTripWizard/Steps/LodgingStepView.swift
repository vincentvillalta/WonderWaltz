import SwiftUI
import WWDesignSystem

/// Step 4: Lodging type and transport selection.
/// Title: "Where are you staying?"
/// On-property enables Early Entry; Deluxe/Villa enables Extended Evening Hours per SOLV-09.
struct LodgingStepView: View {

    @Bindable var viewModel: WizardViewModel

    private static let lodgingOptions: [(id: String, label: String, detail: String)] = [
        ("value", "On-property Value", "All-Star, Pop Century, Art of Animation"),
        ("moderate", "On-property Moderate", "Caribbean Beach, Coronado Springs"),
        ("deluxe", "On-property Deluxe", "Contemporary, Polynesian, Grand Floridian"),
        ("deluxe-villa", "On-property Deluxe Villa", "Riviera, Saratoga Springs, Old Key West"),
        ("off-property", "Off-property", "Hotel, rental, or staying with friends"),
        ("day-visitor", "Day visitor", "Not staying overnight"),
    ]

    private static let transportOptions: [(id: String, label: String, icon: String)] = [
        ("car", "Car", "car"),
        ("bus", "Disney Transport", "bus"),
        ("rideshare", "Rideshare", "figure.wave"),
    ]

    /// Whether the selected lodging enables Early Entry.
    private var hasEarlyEntry: Bool {
        guard let lodging = viewModel.lodgingType else { return false }
        return ["value", "moderate", "deluxe", "deluxe-villa"].contains(lodging)
    }

    /// Whether the selected lodging enables Extended Evening Hours.
    private var hasExtendedEvening: Bool {
        guard let lodging = viewModel.lodgingType else { return false }
        return ["deluxe", "deluxe-villa"].contains(lodging)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: WWDesignTokens.spacing10) {
                Text(LocalizedStringKey("Where are you staying?"))
                    .font(WWTypography.title)
                    .foregroundStyle(WWTheme.textPrimary)
                    .accessibilityAddTraits(.isHeader)

                Text(LocalizedStringKey("This helps us plan your park schedule and transportation."))
                    .font(WWTypography.body)
                    .foregroundStyle(WWTheme.textSecondary)

                // Lodging section
                Text(LocalizedStringKey("Lodging"))
                    .font(WWTypography.headline)
                    .foregroundStyle(WWTheme.textPrimary)

                ForEach(Self.lodgingOptions, id: \.id) { option in
                    lodgingRow(option: option)
                }

                // Perks info
                if hasEarlyEntry || hasExtendedEvening {
                    WWCard {
                        VStack(alignment: .leading, spacing: WWDesignTokens.spacing2) {
                            if hasEarlyEntry {
                                Label {
                                    Text(LocalizedStringKey("Early Entry (+30 min before park opens)"))
                                        .font(WWTypography.footnote)
                                } icon: {
                                    Image(systemName: "sunrise")
                                        .foregroundStyle(WWTheme.accent)
                                }
                            }
                            if hasExtendedEvening {
                                Label {
                                    Text(LocalizedStringKey("Extended Evening Hours (select nights)"))
                                        .font(WWTypography.footnote)
                                } icon: {
                                    Image(systemName: "moon.stars")
                                        .foregroundStyle(WWTheme.accent)
                                }
                            }
                        }
                    }
                }

                // Transport section
                Text(LocalizedStringKey("Getting around"))
                    .font(WWTypography.headline)
                    .foregroundStyle(WWTheme.textPrimary)
                    .padding(.top, WWDesignTokens.spacing4)

                HStack(spacing: WWDesignTokens.spacing4) {
                    ForEach(Self.transportOptions, id: \.id) { option in
                        transportCard(option: option)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(WWDesignTokens.spacing8)
        }
    }

    // MARK: - Lodging Row

    @ViewBuilder
    private func lodgingRow(option: (id: String, label: String, detail: String)) -> some View {
        let isSelected = viewModel.lodgingType == option.id

        Button {
            viewModel.lodgingType = option.id
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(LocalizedStringKey(option.label))
                        .font(WWTypography.subheadline)
                        .foregroundStyle(WWTheme.textPrimary)
                    Text(LocalizedStringKey(option.detail))
                        .font(WWTypography.caption)
                        .foregroundStyle(WWTheme.textSecondary)
                }

                Spacer()

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isSelected ? WWTheme.accent : WWTheme.textSecondary)
                    .font(.title3)
            }
            .padding(.vertical, WWDesignTokens.spacing4)
            .padding(.horizontal, WWDesignTokens.spacing4)
            .frame(minHeight: WWDesignTokens.iconographyMinTapTarget)
            .background(isSelected ? WWTheme.accent.opacity(0.08) : .clear)
            .clipShape(RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text(option.label))
        .accessibilityValue(Text(isSelected ? "Selected" : "Not selected"))
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    // MARK: - Transport Card

    @ViewBuilder
    private func transportCard(option: (id: String, label: String, icon: String)) -> some View {
        let isSelected = viewModel.transportType == option.id

        Button {
            viewModel.transportType = option.id
        } label: {
            VStack(spacing: WWDesignTokens.spacing2) {
                Image(systemName: option.icon)
                    .font(.title2)
                    .foregroundStyle(isSelected ? WWTheme.accent : WWTheme.textSecondary)

                Text(LocalizedStringKey(option.label))
                    .font(WWTypography.caption)
                    .foregroundStyle(WWTheme.textPrimary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity)
            .frame(minHeight: 80)
            .padding(WWDesignTokens.spacing4)
            .background(WWTheme.surface)
            .clipShape(RoundedRectangle(cornerRadius: WWDesignTokens.radiusMd))
            .overlay(
                RoundedRectangle(cornerRadius: WWDesignTokens.radiusMd)
                    .strokeBorder(
                        isSelected ? WWTheme.accent : WWTheme.muted,
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text(option.label))
        .accessibilityValue(Text(isSelected ? "Selected" : "Not selected"))
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}

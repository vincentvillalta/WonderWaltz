import SwiftUI
import WWDesignSystem

/// Step 1: Dates & Party -- combines trip dates + party members.
/// Matches TripSetup.tsx currentStep === 0, lines 96-249.
///
/// Layout:
/// - Trip dates: 2-column grid with Check-in / Check-out date pickers
/// - Party members: scrollable card list (adults + children)
/// - "Add Family Member" dashed button
struct DatesPartyStepView: View {

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

    private let dietaryOptions = [
        "None", "Vegetarian", "Vegan", "Gluten-free", "Nut allergy"
    ]

    private let ageBrackets = [
        "0-2", "3-5", "6-9", "10-12", "13-17", "18+"
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing10) {
            // Trip Dates section
            tripDatesSection

            // Validation warning
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

            // Party Members section
            partyMembersSection
        }
    }

    // MARK: - Trip Dates (lines 98-117)

    private var tripDatesSection: some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing4) {
            Text("Trip Dates")
                .font(WWTypography.subheadline)
                .foregroundStyle(WWTheme.textSecondary)

            HStack(spacing: WWDesignTokens.spacing4) {
                // Check-in
                VStack(alignment: .leading, spacing: 2) {
                    Text("Check-in")
                        .font(WWTypography.caption)
                        .foregroundStyle(WWTheme.textSecondary)
                        .padding(.leading, 2)

                    DatePicker(
                        "",
                        selection: $viewModel.startDate,
                        in: Date.now...,
                        displayedComponents: .date
                    )
                    .labelsHidden()
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(WWTheme.surface)
                    .clipShape(
                        RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                            .stroke(WWTheme.border, lineWidth: 1)
                    )
                }

                // Check-out
                VStack(alignment: .leading, spacing: 2) {
                    Text("Check-out")
                        .font(WWTypography.caption)
                        .foregroundStyle(WWTheme.textSecondary)
                        .padding(.leading, 2)

                    DatePicker(
                        "",
                        selection: $viewModel.endDate,
                        in: viewModel.startDate...,
                        displayedComponents: .date
                    )
                    .labelsHidden()
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
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
        }
    }

    // MARK: - Party Members (lines 120-248)

    private var partyMembersSection: some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing4) {
            Text("Party Members")
                .font(WWTypography.subheadline)
                .foregroundStyle(WWTheme.textSecondary)

            ForEach($viewModel.guests) { $guest in
                guestCard(guest: $guest, index: viewModel.guests.firstIndex(
                    where: { $0.id == guest.id }
                ) ?? 0)
            }

            // "Add Family Member" dashed button (line 243)
            Button {
                viewModel.guests.append(GuestInput())
            } label: {
                HStack(spacing: WWDesignTokens.spacing2) {
                    Text("+")
                    Text("Add Family Member")
                }
                .font(WWTypography.subheadline)
                .foregroundStyle(WWTheme.textSecondary)
                .frame(maxWidth: .infinity)
                .frame(height: 40)
                .background(Color.clear)
                .clipShape(
                    RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                        .strokeBorder(
                            WWTheme.border,
                            style: StrokeStyle(lineWidth: 2, dash: [6])
                        )
                )
            }
            .accessibilityLabel(Text("Add family member"))
        }
    }

    // MARK: - Guest Card

    @ViewBuilder
    private func guestCard(guest: Binding<GuestInput>, index: Int) -> some View {
        let isChild = guest.wrappedValue.isChild
        let avatarColor = avatarBackground(for: guest.wrappedValue, index: index)
        let avatarEmoji = isChild
            ? (index % 2 == 0 ? "\u{1F467}" : "\u{1F466}") // girl / boy
            : "\u{1F464}" // person silhouette

        VStack(alignment: .leading, spacing: WWDesignTokens.spacing4) {
            // Avatar + name row
            HStack(spacing: WWDesignTokens.spacing4) {
                // Avatar circle (32pt)
                Text(avatarEmoji)
                    .font(.system(size: 14))
                    .frame(width: 32, height: 32)
                    .background(avatarColor)
                    .clipShape(Circle())

                // Name text field
                TextField(
                    isChild ? "Child name" : "Adult name",
                    text: guest.name
                )
                .font(WWTypography.subheadline)
                .frame(height: 36)
                .padding(.horizontal, WWDesignTokens.spacing6)
                .background(WWTheme.background)
                .clipShape(
                    RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm - 4)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm - 4)
                        .stroke(WWTheme.border, lineWidth: 1)
                )

                // Delete button (only if more than 1 guest)
                if viewModel.guests.count > 1 {
                    Button {
                        viewModel.guests.removeAll {
                            $0.id == guest.wrappedValue.id
                        }
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(WWTheme.textSecondary)
                            .frame(width: 28, height: 28)
                    }
                    .accessibilityLabel(
                        Text("Remove \(guest.wrappedValue.name.isEmpty ? "guest" : guest.wrappedValue.name)")
                    )
                }
            }

            // Age bracket selector
            HStack(spacing: WWDesignTokens.spacing4) {
                // Age bracket picker
                Picker("Age", selection: guest.ageBracket) {
                    ForEach(ageBrackets, id: \.self) { bracket in
                        Text(bracket).tag(bracket)
                    }
                }
                .font(WWTypography.subheadline)
                .frame(height: 36)
                .tint(WWTheme.textPrimary)

                // Height field (for children)
                if isChild {
                    HStack(spacing: 4) {
                        TextField(
                            "Height",
                            value: guest.heightInches,
                            format: .number
                        )
                        .font(WWTypography.subheadline)
                        .keyboardType(.numberPad)
                        .frame(height: 36)
                        .padding(.horizontal, WWDesignTokens.spacing6)
                        .background(WWTheme.background)
                        .clipShape(
                            RoundedRectangle(
                                cornerRadius: WWDesignTokens.radiusSm - 4
                            )
                        )
                        .overlay(
                            RoundedRectangle(
                                cornerRadius: WWDesignTokens.radiusSm - 4
                            )
                            .stroke(WWTheme.border, lineWidth: 1)
                        )

                        Text("in")
                            .font(WWTypography.caption)
                            .foregroundStyle(WWTheme.textSecondary)
                    }
                }
            }

            // DAS flag toggle
            Toggle(isOn: guest.hasDAS) {
                HStack(spacing: WWDesignTokens.spacing2) {
                    Image(systemName: "accessibility")
                        .font(.system(size: 14))
                    Text("DAS (Disability Access)")
                        .font(WWTypography.subheadline)
                }
            }
            .toggleStyle(.switch)
            .tint(WWTheme.accent)

            // Dietary dropdown
            Picker("Dietary needs", selection: Binding(
                get: {
                    guest.wrappedValue.dietaryRestrictions.first ?? ""
                },
                set: { newValue in
                    if newValue.isEmpty || newValue == "None" {
                        guest.wrappedValue.dietaryRestrictions = []
                    } else {
                        guest.wrappedValue.dietaryRestrictions = [newValue]
                    }
                }
            )) {
                Text("Dietary needs (optional)").tag("")
                ForEach(dietaryOptions, id: \.self) { option in
                    Text(option).tag(option)
                }
            }
            .font(WWTypography.subheadline)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(height: 36)
            .tint(WWTheme.textSecondary)
        }
        .padding(WWDesignTokens.spacing6)
        .background(WWTheme.surface)
        .clipShape(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
        )
        .overlay(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                .stroke(WWTheme.border, lineWidth: 1)
        )
    }

    /// Avatar background color matching React design.
    /// Adults: navy at 10%. Children cycle through park colors.
    private func avatarBackground(
        for guest: GuestInput,
        index: Int
    ) -> Color {
        if guest.isChild {
            // Cycle through park colors for children
            let childIndex = viewModel.guests.prefix(index + 1)
                .filter(\.isChild).count - 1
            let parkColors: [ParkColor] = [
                .magicKingdom, .epcot, .hollywoodStudios, .animalKingdom
            ]
            let parkColor = parkColors[
                childIndex % parkColors.count
            ]
            return parkColor.color.opacity(0.1)
        } else {
            return WWTheme.primary.opacity(0.1)
        }
    }
}

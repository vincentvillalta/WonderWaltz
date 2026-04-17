import SwiftUI
import WWDesignSystem

/// Step 2: Guest details with DAS, mobility, sensory, dietary.
/// Title: "Who's coming?"
/// Age stored as bracket string per LEGL-07 -- never birthdate.
struct GuestsStepView: View {

    @Bindable var viewModel: WizardViewModel

    private static let ageBrackets = ["0-2", "3-6", "7-9", "10-13", "14-17", "18+"]
    private static let mobilityOptions = ["Wheelchair", "ECV", "Limited walking"]
    private static let sensoryOptions = ["Noise sensitivity", "Light sensitivity"]
    private static let dietaryOptions = [
        "Vegetarian", "Vegan", "Gluten-free",
        "Food allergies", "Kosher", "Halal",
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: WWDesignTokens.spacing10) {
                Text(LocalizedStringKey("Who's coming?"))
                    .font(WWTypography.title)
                    .foregroundStyle(WWTheme.textPrimary)
                    .accessibilityAddTraits(.isHeader)

                Text(LocalizedStringKey("Tell us about your group so we can personalize your plan."))
                    .font(WWTypography.body)
                    .foregroundStyle(WWTheme.textSecondary)

                ForEach($viewModel.guests) { $guest in
                    guestCard(guest: $guest)
                }

                // Add guest button
                Button {
                    viewModel.guests.append(GuestInput())
                } label: {
                    HStack(spacing: WWDesignTokens.spacing2) {
                        Image(systemName: "plus.circle.fill")
                            .foregroundStyle(WWTheme.accent)
                        Text(LocalizedStringKey("Add another guest"))
                            .font(WWTypography.callout)
                            .foregroundStyle(WWTheme.primary)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: WWDesignTokens.iconographyMinTapTarget)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(Text("Add another guest"))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(WWDesignTokens.spacing8)
        }
    }

    // MARK: - Guest Card

    @ViewBuilder
    private func guestCard(guest: Binding<GuestInput>) -> some View {
        WWCard {
            VStack(alignment: .leading, spacing: WWDesignTokens.spacing6) {
                // Header with remove button
                HStack {
                    Text(LocalizedStringKey("Guest"))
                        .font(WWTypography.headline)
                        .foregroundStyle(WWTheme.textPrimary)

                    Spacer()

                    if viewModel.guests.count > 1 {
                        Button {
                            viewModel.guests.removeAll { $0.id == guest.wrappedValue.id }
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
                        .accessibilityLabel(Text("Remove guest"))
                    }
                }

                // Name
                TextField(
                    String(localized: "Name (optional)", comment: "Guest name field placeholder"),
                    text: guest.name
                )
                .font(WWTypography.body)
                .textFieldStyle(.roundedBorder)
                .accessibilityLabel(Text("Guest name"))

                // Age bracket picker
                Picker(
                    String(localized: "Age group", comment: "Guest age bracket picker label"),
                    selection: guest.ageBracket
                ) {
                    ForEach(Self.ageBrackets, id: \.self) { bracket in
                        Text(bracket).tag(bracket)
                    }
                }
                .pickerStyle(.segmented)
                .accessibilityLabel(Text("Age group"))

                // DAS toggle
                Toggle(isOn: guest.hasDAS) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(LocalizedStringKey("DAS (Disability Access Service)"))
                            .font(WWTypography.subheadline)
                        Text(LocalizedStringKey("Reduces time waiting in queues"))
                            .font(WWTypography.caption)
                            .foregroundStyle(WWTheme.textSecondary)
                    }
                }
                .tint(WWTheme.accent)
                .accessibilityLabel(Text("Disability Access Service"))

                // Mobility needs
                multiSelectSection(
                    title: String(localized: "Mobility needs", comment: "Guest mobility section"),
                    options: Self.mobilityOptions,
                    selection: guest.mobilityNeeds
                )

                // Sensory needs
                multiSelectSection(
                    title: String(localized: "Sensory needs", comment: "Guest sensory section"),
                    options: Self.sensoryOptions,
                    selection: guest.sensoryNeeds
                )

                // Dietary restrictions
                multiSelectSection(
                    title: String(localized: "Dietary restrictions", comment: "Guest dietary section"),
                    options: Self.dietaryOptions,
                    selection: guest.dietaryRestrictions
                )
            }
        }
    }

    // MARK: - Multi-Select Section

    @ViewBuilder
    private func multiSelectSection(
        title: String,
        options: [String],
        selection: Binding<[String]>
    ) -> some View {
        DisclosureGroup {
            FlowLayout(spacing: WWDesignTokens.spacing2) {
                ForEach(options, id: \.self) { option in
                    let isSelected = selection.wrappedValue.contains(option)
                    Button {
                        if isSelected {
                            selection.wrappedValue.removeAll { $0 == option }
                        } else {
                            selection.wrappedValue.append(option)
                        }
                    } label: {
                        Text(option)
                            .font(WWTypography.caption)
                            .padding(.horizontal, WWDesignTokens.spacing4)
                            .padding(.vertical, WWDesignTokens.spacing2)
                            .background(isSelected ? WWTheme.accent.opacity(0.2) : WWTheme.muted)
                            .foregroundStyle(isSelected ? WWTheme.primary : WWTheme.textSecondary)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .frame(minHeight: WWDesignTokens.iconographyMinTapTarget)
                    .accessibilityLabel(Text(option))
                    .accessibilityValue(Text(isSelected ? "Selected" : "Not selected"))
                    .accessibilityAddTraits(isSelected ? [.isSelected] : [])
                }
            }
        } label: {
            Text(title)
                .font(WWTypography.subheadline)
                .foregroundStyle(WWTheme.textPrimary)
        }
    }
}

// MARK: - FlowLayout

/// Simple flow layout for chip-style multi-select options.
struct FlowLayout: Layout {
    var spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = layout(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = layout(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y),
                proposal: .unspecified
            )
        }
    }

    private func layout(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }

        return (CGSize(width: maxWidth, height: y + rowHeight), positions)
    }
}

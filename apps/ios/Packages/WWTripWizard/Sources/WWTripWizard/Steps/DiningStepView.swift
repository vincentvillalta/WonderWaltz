import SwiftUI
import WWDesignSystem

/// Step 3: Dining ADRs -- dining suggestions toggle + budget + character dining + reservations.
/// Matches TripSetup.tsx currentStep === 2, lines 345-434.
///
/// Layout:
/// - Dining suggestions toggle in gold-tinted card
/// - 3-column budget grid ($, $$, $$$) with gold highlight
/// - Character dining radio cards
/// - Existing reservations list + Add Reservation button
struct DiningStepView: View {

    @Bindable var viewModel: WizardViewModel
    @State private var showingAddReservation = false

    var body: some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing10) {
            // Dining suggestions toggle
            diningSuggestionsCard

            // Budget preference
            budgetSection

            // Character dining
            characterDiningSection

            // Existing reservations
            reservationsSection
        }
    }

    // MARK: - Dining Suggestions Toggle (lines 347-360)

    private var diningSuggestionsCard: some View {
        HStack(alignment: .top, spacing: WWDesignTokens.spacing6) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Get Dining Suggestions")
                    .font(WWTypography.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(WWTheme.textPrimary)
                Text("We'll recommend restaurants and help you find reservations")
                    .font(WWTypography.subheadline)
                    .foregroundStyle(WWTheme.textSecondary)
            }

            Spacer()

            Toggle("", isOn: $viewModel.wantDiningSuggestions)
                .labelsHidden()
                .tint(WWTheme.primary)
        }
        .padding(WWDesignTokens.spacing8)
        .background(
            LinearGradient(
                colors: [
                    WWTheme.accent.opacity(0.1),
                    WWTheme.accent.opacity(0.05)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
        )
        .overlay(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                .stroke(WWTheme.accent.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Budget Preference (lines 363-378)

    private var budgetSection: some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing6) {
            Text("Dining Budget")
                .font(WWTypography.subheadline)
                .foregroundStyle(WWTheme.textSecondary)

            HStack(spacing: WWDesignTokens.spacing4) {
                ForEach(DiningBudget.allCases, id: \.self) { budget in
                    budgetCard(budget: budget)
                }
            }
        }
    }

    private func budgetCard(budget: DiningBudget) -> some View {
        let isSelected = viewModel.diningBudget == budget

        return Button {
            viewModel.diningBudget = budget
        } label: {
            VStack(spacing: WWDesignTokens.spacing2) {
                Text(budget.displaySymbol)
                    .font(.system(size: 24))
                    .foregroundStyle(WWTheme.textPrimary)
                Text(budget.displayLabel)
                    .font(WWTypography.caption)
                    .fontWeight(isSelected ? .medium : .regular)
                    .foregroundStyle(
                        isSelected
                            ? WWTheme.textPrimary
                            : WWTheme.textSecondary
                    )
            }
            .frame(maxWidth: .infinity)
            .frame(height: 80) // h-20 = 80pt
            .background(
                isSelected
                    ? WWTheme.accent.opacity(0.05)
                    : WWTheme.surface
            )
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
        .accessibilityLabel(Text(budget.displayLabel))
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    // MARK: - Character Dining (lines 381-406)

    private var characterDiningSection: some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing6) {
            Text("Character Dining")
                .font(WWTypography.subheadline)
                .foregroundStyle(WWTheme.textSecondary)

            ForEach(CharacterDiningPref.allCases, id: \.self) { pref in
                characterDiningCard(pref: pref)
            }
        }
    }

    private func characterDiningCard(
        pref: CharacterDiningPref
    ) -> some View {
        let isSelected = viewModel.characterDining == pref
        // "Must have" uses MK pink border when selected per React
        let selectedBorderColor: Color = pref == .must
            ? ParkColor.magicKingdom.color
            : WWTheme.accent

        return Button {
            viewModel.characterDining = pref
        } label: {
            HStack(spacing: WWDesignTokens.spacing6) {
                // Radio circle
                Circle()
                    .strokeBorder(
                        isSelected ? selectedBorderColor : WWTheme.border,
                        lineWidth: isSelected ? 2 : 1.5
                    )
                    .frame(width: 20, height: 20)
                    .overlay(
                        Circle()
                            .fill(isSelected ? WWTheme.primary : .clear)
                            .frame(width: 10, height: 10)
                    )

                VStack(alignment: .leading, spacing: 2) {
                    Text(pref.displayTitle)
                        .font(WWTypography.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(WWTheme.textPrimary)
                    Text(pref.displaySubtitle)
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
                        isSelected ? selectedBorderColor : WWTheme.border,
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    // MARK: - Existing Reservations (lines 409-432)

    private var reservationsSection: some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing6) {
            Text("Existing Reservations (Optional)")
                .font(WWTypography.subheadline)
                .foregroundStyle(WWTheme.textSecondary)

            ForEach($viewModel.existingReservations) { $reservation in
                reservationCard(reservation: $reservation)
            }

            // "Add Reservation" dashed button
            Button {
                viewModel.existingReservations.append(DiningReservation())
            } label: {
                HStack(spacing: WWDesignTokens.spacing2) {
                    Text("+")
                    Text("Add Reservation")
                }
                .font(WWTypography.subheadline)
                .foregroundStyle(WWTheme.textSecondary)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
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
            .accessibilityLabel(Text("Add dining reservation"))
        }
    }

    private func reservationCard(
        reservation: Binding<DiningReservation>
    ) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    TextField(
                        "Restaurant name",
                        text: reservation.restaurantName
                    )
                    .font(WWTypography.subheadline)
                    .fontWeight(.medium)

                    TextField("Park", text: reservation.parkName)
                        .font(WWTypography.caption)
                        .foregroundStyle(WWTheme.textSecondary)
                }

                Spacer()

                Button {
                    viewModel.existingReservations.removeAll {
                        $0.id == reservation.wrappedValue.id
                    }
                } label: {
                    Text("\u{2715}")
                        .font(WWTypography.caption)
                        .foregroundStyle(WWTheme.textSecondary)
                }
                .accessibilityLabel(
                    Text("Remove \(reservation.wrappedValue.restaurantName)")
                )
            }

            HStack(spacing: WWDesignTokens.spacing4) {
                DatePicker(
                    "",
                    selection: reservation.date,
                    displayedComponents: .date
                )
                .labelsHidden()
                .font(WWTypography.caption)

                TextField("Time", text: reservation.time)
                    .font(WWTypography.caption)
                    .foregroundStyle(WWTheme.textSecondary)
                    .frame(width: 80)
                    .frame(height: 32)
                    .padding(.horizontal, 8)
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
            }
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
}

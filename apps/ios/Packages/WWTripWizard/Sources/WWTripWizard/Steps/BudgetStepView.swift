import SwiftUI
import WWDesignSystem

/// Step 3: Budget tier selection (3 options per SOLV-10).
/// Title: "What's your style?"
struct BudgetStepView: View {

    @Bindable var viewModel: WizardViewModel

    /// Budget tier definitions matching SOLV-10.
    private static let tiers: [(id: String, name: String, tagline: String, description: String, icon: String)] = [
        (
            "value",
            "Pixie Dust",
            "Smart planning, maximum fun",
            "No Lightning Lane, value dining",
            "wand.and.stars"
        ),
        (
            "moderate",
            "Fairy Tale",
            "The classic Disney experience",
            "Lightning Lane Multi Pass, moderate dining",
            "sparkles"
        ),
        (
            "premium",
            "Royal Treatment",
            "No compromises",
            "Lightning Lane Multi + Single Pass, signature dining",
            "crown"
        ),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: WWDesignTokens.spacing10) {
                Text(LocalizedStringKey("What's your style?"))
                    .font(WWTypography.title)
                    .foregroundStyle(WWTheme.textPrimary)
                    .accessibilityAddTraits(.isHeader)

                Text(LocalizedStringKey("Choose how you'd like to experience the parks."))
                    .font(WWTypography.body)
                    .foregroundStyle(WWTheme.textSecondary)

                ForEach(Self.tiers, id: \.id) { tier in
                    tierCard(tier: tier)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(WWDesignTokens.spacing8)
        }
    }

    // MARK: - Tier Card

    @ViewBuilder
    private func tierCard(tier: (id: String, name: String, tagline: String, description: String, icon: String)) -> some View {
        let isSelected = viewModel.budgetTier == tier.id

        Button {
            viewModel.budgetTier = tier.id
        } label: {
            HStack(spacing: WWDesignTokens.spacing6) {
                Image(systemName: tier.icon)
                    .font(.system(size: 28))
                    .foregroundStyle(isSelected ? WWTheme.accent : WWTheme.textSecondary)
                    .frame(width: 40)

                VStack(alignment: .leading, spacing: WWDesignTokens.spacing1) {
                    Text(LocalizedStringKey(tier.name))
                        .font(WWTypography.headline)
                        .foregroundStyle(WWTheme.textPrimary)

                    Text(LocalizedStringKey(tier.tagline))
                        .font(WWTypography.subheadline)
                        .foregroundStyle(isSelected ? WWTheme.accent : WWTheme.textSecondary)

                    Text(LocalizedStringKey(tier.description))
                        .font(WWTypography.caption)
                        .foregroundStyle(WWTheme.textSecondary)
                }

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title2)
                        .foregroundStyle(WWTheme.accent)
                }
            }
            .padding(WWDesignTokens.spacing6)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(minHeight: WWDesignTokens.iconographyMinTapTarget)
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
        .accessibilityLabel(Text("\(tier.name): \(tier.tagline)"))
        .accessibilityValue(Text(isSelected ? "Selected" : "Not selected"))
        .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : [.isButton])
    }
}

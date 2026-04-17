import SwiftUI
import WWDesignSystem

/// Horizontal scrollable tab bar for switching between plan days.
/// Shows day number + park abbreviation per tab. Lock icon on locked days.
/// Gold underline on selected tab. Min 44pt tap target.
public struct DayTabPicker: View {

    public let days: [PlanDayData]
    @Binding public var selectedIndex: Int

    public init(days: [PlanDayData], selectedIndex: Binding<Int>) {
        self.days = days
        self._selectedIndex = selectedIndex
    }

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: WWDesignTokens.spacing4) {
                    ForEach(Array(days.enumerated()), id: \.element.id) { index, day in
                        dayTab(day: day, index: index)
                            .id(index)
                    }
                }
                .padding(.horizontal, WWDesignTokens.spacing8)
            }
            .onChange(of: selectedIndex) { _, newValue in
                if reduceMotion {
                    proxy.scrollTo(newValue, anchor: .center)
                } else {
                    withAnimation(.easeInOut(duration: 0.25)) {
                        proxy.scrollTo(newValue, anchor: .center)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func dayTab(day: PlanDayData, index: Int) -> some View {
        let isSelected = index == selectedIndex

        Button {
            selectedIndex = index
        } label: {
            VStack(spacing: WWDesignTokens.spacing1) {
                HStack(spacing: WWDesignTokens.spacing1) {
                    if day.isLocked {
                        Image(systemName: "lock.fill")
                            .font(.caption2)
                            .foregroundStyle(WWTheme.textSecondary)
                    }
                    Text("Day \(day.dayNumber)")
                        .font(isSelected ? WWTypography.headline : WWTypography.subheadline)
                        .foregroundStyle(isSelected ? WWTheme.textPrimary : WWTheme.textSecondary)
                }

                Text(day.parkAbbreviation)
                    .font(WWTypography.caption)
                    .foregroundStyle(isSelected ? WWTheme.textPrimary : WWTheme.textSecondary)
            }
            .frame(minWidth: WWDesignTokens.iconographyMinTapTarget)
            .frame(minHeight: WWDesignTokens.iconographyMinTapTarget)
            .padding(.horizontal, WWDesignTokens.spacing4)
            .overlay(alignment: .bottom) {
                if isSelected {
                    Rectangle()
                        .fill(WWTheme.accent)
                        .frame(height: 3)
                        .clipShape(Capsule())
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(
            day.isLocked
                ? "Day \(day.dayNumber), \(day.parkName), locked"
                : "Day \(day.dayNumber), \(day.parkName)"
        )
        .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : [.isButton])
    }
}

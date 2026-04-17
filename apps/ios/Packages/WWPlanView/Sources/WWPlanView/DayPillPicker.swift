import SwiftUI
import WWDesignSystem

/// Horizontal scrollable day pills matching React Itinerary.tsx day selector.
/// Each pill shows day abbreviation, date, and park short name.
/// Selected pill: white bg, 2pt park-color border, shadow-sm.
/// Unselected pill: muted/50% bg, transparent border.
public struct DayPillPicker: View {

    public let days: [PlanDayData]
    @Binding public var selectedIndex: Int
    public let parkColorForDay: (PlanDayData) -> ParkColor

    public init(
        days: [PlanDayData],
        selectedIndex: Binding<Int>,
        parkColorForDay: @escaping (PlanDayData) -> ParkColor
    ) {
        self.days = days
        self._selectedIndex = selectedIndex
        self.parkColorForDay = parkColorForDay
    }

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Array(days.enumerated()), id: \.element.id) { index, day in
                        dayPill(day: day, index: index)
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

    // MARK: - Day Pill

    @ViewBuilder
    private func dayPill(day: PlanDayData, index: Int) -> some View {
        let isSelected = index == selectedIndex
        let park = parkColorForDay(day)

        Button {
            selectedIndex = index
        } label: {
            VStack(spacing: 2) {
                // Day abbreviation (Mon/Tue/Wed)
                Text(dayAbbreviation(from: day.date))
                    .font(WWTypography.caption)
                    .foregroundStyle(WWTheme.textSecondary)

                // Date (Jul 15)
                Text(formattedDate(from: day.date))
                    .font(WWTypography.subheadline.weight(.medium))
                    .foregroundStyle(WWTheme.textPrimary)

                // Park short name
                Text(park.shortName)
                    .font(WWTypography.caption)
                    .foregroundStyle(isSelected ? park.color : WWTheme.textSecondary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                    .fill(isSelected ? WWTheme.surface : WWTheme.muted.opacity(0.5))
            )
            .overlay(
                RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                    .stroke(isSelected ? park.color : .clear, lineWidth: 2)
            )
            .shadow(color: isSelected ? .black.opacity(0.06) : .clear, radius: 4, x: 0, y: 2)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(
            day.isLocked
                ? "Day \(day.dayNumber), \(day.parkName), locked"
                : "Day \(day.dayNumber), \(day.parkName)"
        )
        .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : [.isButton])
    }

    // MARK: - Date Formatting Helpers

    /// Extract day abbreviation from date string (e.g., "2026-05-01" -> "Thu").
    private func dayAbbreviation(from dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: dateString) else {
            return "Day"
        }
        let abbrevFormatter = DateFormatter()
        abbrevFormatter.dateFormat = "EEE"
        return abbrevFormatter.string(from: date)
    }

    /// Format date for display (e.g., "2026-05-01" -> "May 1").
    private func formattedDate(from dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: dateString) else {
            return dateString
        }
        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "MMM d"
        return displayFormatter.string(from: date)
    }
}

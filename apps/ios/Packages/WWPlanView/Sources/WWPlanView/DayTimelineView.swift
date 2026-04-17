import SwiftUI
import WWDesignSystem

/// Scrollable timeline of plan items in chronological order.
/// Stub — full implementation in Task 2.
public struct DayTimelineView: View {

    public let day: PlanDayData
    public let completedItemIds: Set<String>
    public let onToggleCompleted: (String) -> Void

    public init(
        day: PlanDayData,
        completedItemIds: Set<String> = [],
        onToggleCompleted: @escaping (String) -> Void = { _ in }
    ) {
        self.day = day
        self.completedItemIds = completedItemIds
        self.onToggleCompleted = onToggleCompleted
    }

    public var body: some View {
        ScrollView {
            Text("Timeline placeholder")
                .foregroundStyle(WWTheme.textSecondary)
        }
    }
}

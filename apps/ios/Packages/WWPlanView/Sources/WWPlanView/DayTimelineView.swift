import SwiftUI
import WWDesignSystem

/// Scrollable timeline of plan items in chronological order.
/// Shows items with time column on left, vertical timeline line, and walking times between items.
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

    /// Items sorted by sortOrder, excluding walk type (walks shown as connectors).
    private var sortedItems: [PlanItemData] {
        day.items
            .filter { $0.type != .walk }
            .sorted { $0.sortOrder < $1.sortOrder }
    }

    public var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                // Day narrative intro
                if let intro = day.narrativeIntro {
                    Text(intro)
                        .font(WWTypography.body)
                        .foregroundStyle(WWTheme.textSecondary)
                        .padding(.horizontal, WWDesignTokens.spacing8)
                        .padding(.vertical, WWDesignTokens.spacing6)
                }

                // Timeline items
                ForEach(Array(sortedItems.enumerated()), id: \.element.id) { index, item in
                    VStack(spacing: 0) {
                        // Item card with timeline connector
                        timelineRow(item: item, isFirst: index == 0, isLast: index == sortedItems.count - 1)

                        // Walking time indicator between items
                        if index < sortedItems.count - 1 {
                            if let walkTime = item.walkTimeMinutes, walkTime > 0 {
                                walkingIndicator(minutes: walkTime)
                            } else {
                                // Minimal spacing connector
                                timelineConnector(height: WWDesignTokens.spacing4)
                            }
                        }
                    }
                }
            }
            .padding(.vertical, WWDesignTokens.spacing4)
        }
    }

    // MARK: - Timeline Row

    @ViewBuilder
    private func timelineRow(item: PlanItemData, isFirst: Bool, isLast: Bool) -> some View {
        HStack(alignment: .top, spacing: 0) {
            // Time column
            VStack {
                Text(item.startTime)
                    .font(WWTypography.caption)
                    .foregroundStyle(WWTheme.textSecondary)
                    .frame(width: 50, alignment: .trailing)
            }
            .padding(.top, WWDesignTokens.spacing4)

            // Timeline dot and line
            VStack(spacing: 0) {
                if !isFirst {
                    Rectangle()
                        .fill(WWTheme.muted)
                        .frame(width: 2, height: WWDesignTokens.spacing4)
                }

                Circle()
                    .fill(completedItemIds.contains(item.id) ? WWTheme.success : WWTheme.accent)
                    .frame(width: 10, height: 10)

                if !isLast {
                    Rectangle()
                        .fill(WWTheme.muted)
                        .frame(width: 2)
                        .frame(maxHeight: .infinity)
                }
            }
            .frame(width: 24)
            .padding(.top, WWDesignTokens.spacing4)

            // Card
            NavigationLink {
                PlanItemDetailView(
                    item: item,
                    isCompleted: completedItemIds.contains(item.id),
                    onToggleCompleted: { onToggleCompleted(item.id) }
                )
            } label: {
                PlanItemCard(
                    item: item,
                    isCompleted: completedItemIds.contains(item.id)
                )
            }
            .buttonStyle(.plain)
            .padding(.trailing, WWDesignTokens.spacing8)
            .padding(.leading, WWDesignTokens.spacing2)
        }
    }

    // MARK: - Walking Indicator

    private func walkingIndicator(minutes: Int) -> some View {
        HStack(spacing: 0) {
            // Empty time column
            Color.clear
                .frame(width: 50)

            // Timeline connector with walking icon
            VStack(spacing: 0) {
                Rectangle()
                    .fill(WWTheme.muted)
                    .frame(width: 2, height: WWDesignTokens.spacing6)

                HStack(spacing: WWDesignTokens.spacing1) {
                    Image(systemName: "figure.walk")
                        .font(.caption2)
                    Text("\(minutes) min")
                        .font(WWTypography.caption2)
                }
                .foregroundStyle(WWTheme.textSecondary)
                .padding(.horizontal, WWDesignTokens.spacing2)
                .padding(.vertical, 2)
                .background(
                    Capsule()
                        .fill(WWTheme.muted.opacity(0.5))
                )

                Rectangle()
                    .fill(WWTheme.muted)
                    .frame(width: 2, height: WWDesignTokens.spacing6)
            }
            .frame(width: 24)

            Spacer()
        }
    }

    // MARK: - Timeline Connector

    private func timelineConnector(height: CGFloat) -> some View {
        HStack(spacing: 0) {
            Color.clear
                .frame(width: 50)

            Rectangle()
                .fill(WWTheme.muted)
                .frame(width: 2, height: height)
                .frame(width: 24)

            Spacer()
        }
    }
}

import SwiftUI
import WWDesignSystem

/// Vertical timeline of plan items with park-colored connector lines.
/// Walk items filtered from display, shown as inline capsule badges on connector lines.
/// Cards animate in with staggered delay (index * 0.03s, opacity + y offset 10pt).
public struct DayTimelineView: View {

    public let day: PlanDayData
    public let parkColor: ParkColor
    public let skippedItems: Set<String>
    public let onTapItem: (Int) -> Void
    public let onSkipItem: (String) -> Void
    public let onDoneItem: (String) -> Void

    public init(
        day: PlanDayData,
        parkColor: ParkColor,
        skippedItems: Set<String> = [],
        onTapItem: @escaping (Int) -> Void = { _ in },
        onSkipItem: @escaping (String) -> Void = { _ in },
        onDoneItem: @escaping (String) -> Void = { _ in }
    ) {
        self.day = day
        self.parkColor = parkColor
        self.skippedItems = skippedItems
        self.onTapItem = onTapItem
        self.onSkipItem = onSkipItem
        self.onDoneItem = onDoneItem
    }

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// Items sorted by sortOrder, excluding walk type (walks shown as connectors).
    private var displayItems: [PlanItemData] {
        day.items
            .filter { $0.type != .walk }
            .sorted { $0.sortOrder < $1.sortOrder }
    }

    /// Walk time to next item, keyed by current item index in displayItems.
    private func walkTimeBetween(currentIndex: Int) -> Int? {
        guard currentIndex < displayItems.count - 1 else { return nil }
        let current = displayItems[currentIndex]
        // Look for walk items in the original items list that come after this item
        return current.walkTimeMinutes
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
                ForEach(Array(displayItems.enumerated()), id: \.element.id) { index, item in
                    VStack(spacing: 0) {
                        // Card with staggered animation
                        timelineItemView(item: item, index: index)
                            .modifier(StaggeredAppearance(
                                index: index,
                                reduceMotion: reduceMotion
                            ))

                        // Connector line between items (not after last)
                        if index < displayItems.count - 1 {
                            connectorLine(afterIndex: index)
                        }
                    }
                }
            }
            .padding(.vertical, WWDesignTokens.spacing4)
        }
    }

    // MARK: - Timeline Item

    @ViewBuilder
    private func timelineItemView(item: PlanItemData, index: Int) -> some View {
        HStack(alignment: .top, spacing: 0) {
            // Left margin for connector alignment
            Color.clear
                .frame(width: 18)

            // Card
            PlanItemCard(
                item: item,
                parkColor: parkColor,
                isSkipped: skippedItems.contains(item.id),
                onTap: { onTapItem(index) },
                onSkip: { onSkipItem(item.id) },
                onDone: { onDoneItem(item.id) }
            )
            .padding(.leading, WWDesignTokens.spacing4)
            .padding(.trailing, WWDesignTokens.spacing8)
        }
    }

    // MARK: - Connector Line

    /// Vertical connector line between cards. Park color at 20% opacity.
    /// If there's a walk time, shows inline capsule badge on the line.
    @ViewBuilder
    private func connectorLine(afterIndex index: Int) -> some View {
        let walkTime = walkTimeBetween(currentIndex: index)

        HStack(alignment: .center, spacing: 0) {
            // Position connector at icon center (18pt from leading edge)
            VStack(spacing: 0) {
                if let minutes = walkTime, minutes > 0 {
                    // Line segment above badge
                    Rectangle()
                        .fill(parkColor.color.opacity(0.2))
                        .frame(width: 2, height: 12)

                    // Walking time capsule badge
                    HStack(spacing: 3) {
                        Image(systemName: "figure.walk")
                            .font(.system(size: 9))
                        Text("\(minutes) min")
                            .font(.system(size: 10, weight: .medium))
                    }
                    .foregroundStyle(WWTheme.textSecondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(
                        Capsule()
                            .fill(WWTheme.muted.opacity(0.5))
                    )

                    // Line segment below badge
                    Rectangle()
                        .fill(parkColor.color.opacity(0.2))
                        .frame(width: 2, height: 12)
                } else {
                    // Simple connector line
                    Rectangle()
                        .fill(parkColor.color.opacity(0.2))
                        .frame(width: 2, height: 16)
                }
            }
            .frame(width: 36, alignment: .center)
            .padding(.leading, 0) // Aligned at 18pt (center of 36pt icon column)

            Spacer()
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            walkTime.map { "\($0) minute walk to next item" } ?? ""
        )
    }
}

// MARK: - Staggered Appearance Modifier

/// Animates card appearance with staggered delay per CONTEXT.md.
/// Gated on reduce-motion preference.
private struct StaggeredAppearance: ViewModifier {
    let index: Int
    let reduceMotion: Bool

    @State private var isVisible = false

    func body(content: Content) -> some View {
        content
            .opacity(isVisible ? 1 : 0)
            .offset(y: isVisible ? 0 : 10)
            .onAppear {
                if reduceMotion {
                    isVisible = true
                } else {
                    withAnimation(
                        .easeOut(duration: 0.3)
                        .delay(Double(index) * 0.03)
                    ) {
                        isVisible = true
                    }
                }
            }
    }
}

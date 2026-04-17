import SwiftUI
import WWDesignSystem

/// Swipeable timeline card matching React Itinerary.tsx SwipeableTimelineCard.
/// Park-colored icon (36pt rounded-xl) + center content + badges + drag handle.
/// Swipe left = Skip (red), swipe right = Done (green). Threshold 100pt.
public struct PlanItemCard: View {

    public let item: PlanItemData
    public let parkColor: ParkColor
    public let isSkipped: Bool
    public let onTap: () -> Void
    public let onSkip: () -> Void
    public let onDone: () -> Void

    public init(
        item: PlanItemData,
        parkColor: ParkColor,
        isSkipped: Bool = false,
        onTap: @escaping () -> Void = {},
        onSkip: @escaping () -> Void = {},
        onDone: @escaping () -> Void = {}
    ) {
        self.item = item
        self.parkColor = parkColor
        self.isSkipped = isSkipped
        self.onTap = onTap
        self.onSkip = onSkip
        self.onDone = onDone
    }

    @State private var dragOffset: CGFloat = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let swipeThreshold: CGFloat = 100

    public var body: some View {
        ZStack {
            // Swipe background
            swipeBackground

            // Draggable card
            cardContent
                .offset(x: dragOffset)
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            dragOffset = value.translation.width
                        }
                        .onEnded { value in
                            handleDragEnd(offset: value.translation.width)
                        }
                )
                .onTapGesture {
                    onTap()
                }
        }
        .opacity(isSkipped ? 0.5 : 1.0)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityText)
        .accessibilityAction(named: "Skip") { onSkip() }
        .accessibilityAction(named: "Mark as done") { onDone() }
    }

    // MARK: - Swipe Background

    private var swipeBackground: some View {
        HStack {
            // Left reveal: Skip (red)
            HStack(spacing: 4) {
                Text("Skip")
                    .font(WWTypography.subheadline.weight(.medium))
                    .foregroundStyle(WWDesignTokens.colorParkHollywoodStudios)
            }
            .padding(.leading, 24)

            Spacer()

            // Right reveal: Done (green)
            HStack(spacing: 4) {
                Text("Done")
                    .font(WWTypography.subheadline.weight(.medium))
                    .foregroundStyle(WWDesignTokens.colorParkAnimalKingdom)
            }
            .padding(.trailing, 24)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusBase)
                .fill(WWTheme.surface)
        )
    }

    // MARK: - Card Content

    private var cardContent: some View {
        HStack(alignment: .top, spacing: 12) {
            // Park-colored icon: 36pt rounded-xl
            iconContainer

            // Center content
            VStack(alignment: .leading, spacing: 4) {
                // Title + badges row
                HStack(alignment: .top, spacing: 8) {
                    HStack(spacing: 6) {
                        Text(item.name)
                            .font(WWTypography.headline)
                            .foregroundStyle(WWTheme.textPrimary)
                            .lineLimit(2)

                        if isSkipped {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 16))
                                .foregroundStyle(WWDesignTokens.colorParkAnimalKingdom)
                        }
                    }

                    Spacer(minLength: 0)

                    // Badges
                    badgesView
                }

                // Time + location + wait
                HStack(spacing: 0) {
                    Text(item.startTime)
                        .font(WWTypography.subheadline)
                        .foregroundStyle(parkColor.color)
                        .fontWeight(.medium)

                    Text(" \u{2022} ")
                        .font(WWTypography.subheadline)
                        .foregroundStyle(WWTheme.textSecondary)

                    Text(locationText)
                        .font(WWTypography.subheadline)
                        .foregroundStyle(WWTheme.textSecondary)
                        .lineLimit(1)

                    if let wait = item.waitTimeMinutes {
                        Text(" \u{2022} ")
                            .font(WWTypography.subheadline)
                            .foregroundStyle(WWTheme.textSecondary)
                        Text("\(wait) min")
                            .font(WWTypography.subheadline)
                            .foregroundStyle(WWTheme.textSecondary)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // Drag handle
            Image(systemName: "line.3.horizontal")
                .font(.system(size: 16))
                .foregroundStyle(WWTheme.textSecondary.opacity(0.3))
                .frame(width: 20, height: 20)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusBase)
                .fill(WWTheme.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusBase)
                .stroke(WWTheme.border, lineWidth: 1)
        )
    }

    // MARK: - Icon Container

    /// 36pt (w-9) rounded-xl container with park-color at 8% bg. SF Symbol icon in park-color.
    private var iconContainer: some View {
        ZStack {
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                .fill(parkColor.color.opacity(0.08))
                .frame(width: 36, height: 36)

            itemIcon
                .font(.system(size: 20, weight: .regular))
                .foregroundStyle(parkColor.color)
        }
    }

    @ViewBuilder
    private var itemIcon: some View {
        switch item.type {
        case .attraction:
            Image(systemName: "ticket.fill")
        case .meal:
            Image(systemName: "fork.knife")
        case .show:
            Image(systemName: "theatermasks.fill")
        case .llReminder:
            Image(systemName: "bell.fill")
        case .rest:
            Image(systemName: "clock.fill")
        case .walk:
            Image(systemName: "figure.walk")
        }
    }

    // MARK: - Badges

    @ViewBuilder
    private var badgesView: some View {
        HStack(spacing: 4) {
            if item.isLightningLane {
                Text("LL")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(WWDesignTokens.colorPrimitiveNavy)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(
                        RoundedRectangle(cornerRadius: 4)
                            .fill(WWDesignTokens.colorPrimitiveGold)
                    )
            }
            if item.isADR {
                Text("ADR")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(
                        RoundedRectangle(cornerRadius: 4)
                            .fill(WWDesignTokens.colorParkAnimalKingdom)
                    )
            }
        }
    }

    // MARK: - Helpers

    private var locationText: String {
        // Use cuisine type for meals if available, otherwise fall back to type label
        if item.type == .meal, let cuisine = item.cuisineType {
            return cuisine
        }
        return typeLocationLabel
    }

    private var typeLocationLabel: String {
        switch item.type {
        case .attraction: "Attraction"
        case .meal: "Dining"
        case .show: "Show"
        case .llReminder: "Lightning Lane"
        case .rest: "Break"
        case .walk: "Walking"
        }
    }

    private func handleDragEnd(offset: CGFloat) {
        if offset < -swipeThreshold {
            // Swipe left -> Skip
            onSkip()
        } else if offset > swipeThreshold {
            // Swipe right -> Done
            onDone()
        }

        // Snap back with spring
        if reduceMotion {
            dragOffset = 0
        } else {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                dragOffset = 0
            }
        }
    }

    private var accessibilityText: String {
        var parts: [String] = []
        parts.append(item.type.rawValue)
        parts.append(item.name)
        parts.append("at \(item.startTime)")
        if let waitTime = item.waitTimeMinutes {
            parts.append("\(waitTime) minute wait")
        }
        if item.isLightningLane {
            parts.append("Lightning Lane")
        }
        if item.isADR {
            parts.append("ADR reservation")
        }
        if isSkipped {
            parts.append("completed")
        }
        return parts.joined(separator: ", ")
    }
}

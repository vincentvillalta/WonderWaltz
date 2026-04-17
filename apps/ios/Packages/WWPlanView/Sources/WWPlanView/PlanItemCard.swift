import SwiftUI
import WWDesignSystem

/// Polymorphic card for all plan item types.
/// Uses WWCard as base, renders different visuals per PlanItemType.
public struct PlanItemCard: View {

    public let item: PlanItemData
    public let isCompleted: Bool

    public init(item: PlanItemData, isCompleted: Bool = false) {
        self.item = item
        self.isCompleted = isCompleted
    }

    public var body: some View {
        WWCard {
            HStack(alignment: .top, spacing: WWDesignTokens.spacing4) {
                iconView
                    .frame(width: 28, height: 28)
                    .foregroundStyle(accentColor)

                VStack(alignment: .leading, spacing: WWDesignTokens.spacing1) {
                    // Name
                    Text(item.name)
                        .font(WWTypography.headline)
                        .foregroundStyle(isCompleted ? WWTheme.textSecondary : WWTheme.textPrimary)
                        .strikethrough(isCompleted)

                    // Subtitle / narrative tip
                    if let subtitle = subtitleText {
                        Text(subtitle)
                            .font(WWTypography.caption)
                            .foregroundStyle(WWTheme.textSecondary)
                            .lineLimit(2)
                    }

                    // Badges
                    if !badges.isEmpty {
                        HStack(spacing: WWDesignTokens.spacing2) {
                            ForEach(badges, id: \.self) { badge in
                                Text(badge)
                                    .font(WWTypography.caption2)
                                    .padding(.horizontal, WWDesignTokens.spacing2)
                                    .padding(.vertical, 2)
                                    .background(badgeBackground)
                                    .clipShape(Capsule())
                                    .foregroundStyle(WWTheme.textOnAccent)
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                // Time
                VStack(alignment: .trailing, spacing: 2) {
                    Text(item.startTime)
                        .font(WWTypography.subheadline)
                        .foregroundStyle(WWTheme.textPrimary)

                    if let waitTime = item.waitTimeMinutes {
                        Text("\(waitTime) min")
                            .font(WWTypography.caption2)
                            .foregroundStyle(WWTheme.textSecondary)
                    }
                }
            }
            .frame(minHeight: WWDesignTokens.iconographyMinTapTarget)
        }
        .opacity(isCompleted ? 0.6 : 1.0)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityText)
    }

    // MARK: - Icon

    @ViewBuilder
    private var iconView: some View {
        switch item.type {
        case .attraction:
            Image(systemName: "star.fill")
        case .meal:
            Image(systemName: "fork.knife")
        case .show:
            Image(systemName: "calendar")
        case .llReminder:
            Image(systemName: "bell.fill")
        case .rest:
            Image(systemName: "bed.double.fill")
        case .walk:
            Image(systemName: "figure.walk")
        }
    }

    // MARK: - Accent Color

    private var accentColor: Color {
        switch item.type {
        case .attraction:
            return WWTheme.accent
        case .meal:
            return WWTheme.success
        case .show:
            return WWTheme.primary
        case .llReminder:
            return WWTheme.warning
        case .rest:
            return WWTheme.textSecondary
        case .walk:
            return WWTheme.textSecondary
        }
    }

    // MARK: - Subtitle

    private var subtitleText: String? {
        if let tip = item.narrativeTip {
            return tip
        }
        switch item.type {
        case .meal:
            return item.cuisineType
        case .llReminder:
            if let window = item.bookingWindowTime {
                return "Book at \(window)"
            }
            return nil
        case .rest:
            if let duration = item.durationMinutes {
                return "\(duration) min break"
            }
            return nil
        default:
            return nil
        }
    }

    // MARK: - Badges

    private var badges: [String] {
        var result: [String] = []
        if item.isLightningLane {
            result.append("Lightning Lane")
        }
        if item.isMobileOrder {
            result.append("Mobile Order")
        }
        if item.type == .show {
            result.append("Fixed Time")
        }
        return result
    }

    private var badgeBackground: Color {
        item.type == .llReminder ? WWTheme.warning : WWTheme.accent
    }

    // MARK: - Accessibility

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
        if isCompleted {
            parts.append("completed")
        }
        return parts.joined(separator: ", ")
    }
}

import SwiftUI
import WWDesignSystem

/// Full detail view for a plan item, pushed via NavigationStack.
/// Shows complete item information including narrative tip, walking time, and mark-as-done toggle.
public struct PlanItemDetailView: View {

    public let item: PlanItemData
    public let isCompleted: Bool
    public let onToggleCompleted: () -> Void

    public init(
        item: PlanItemData,
        isCompleted: Bool = false,
        onToggleCompleted: @escaping () -> Void = {}
    ) {
        self.item = item
        self.isCompleted = isCompleted
        self.onToggleCompleted = onToggleCompleted
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: WWDesignTokens.spacing8) {
                // Header
                headerSection

                Divider()

                // Time info
                timeSection

                // Type-specific details
                detailSection

                // Narrative tip
                if let tip = item.narrativeTip {
                    narrativeSection(tip: tip)
                }

                // Walking time to next
                if let walkTime = item.walkTimeMinutes, walkTime > 0 {
                    walkingSection(minutes: walkTime)
                }

                Divider()

                // Mark as done
                completionToggle

                // Map placeholder
                mapPlaceholder
            }
            .padding(WWDesignTokens.spacing8)
        }
        .background(WWTheme.background)
        .navigationTitle(item.name)
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack(spacing: WWDesignTokens.spacing4) {
            itemIcon
                .font(.title2)
                .foregroundStyle(accentColor)

            VStack(alignment: .leading, spacing: WWDesignTokens.spacing1) {
                Text(item.name)
                    .font(WWTypography.title2)
                    .foregroundStyle(WWTheme.textPrimary)

                Text(typeLabel)
                    .font(WWTypography.subheadline)
                    .foregroundStyle(WWTheme.textSecondary)
            }
        }
    }

    // MARK: - Time

    private var timeSection: some View {
        HStack(spacing: WWDesignTokens.spacing8) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Start")
                    .font(WWTypography.caption)
                    .foregroundStyle(WWTheme.textSecondary)
                Text(item.startTime)
                    .font(WWTypography.headline)
                    .foregroundStyle(WWTheme.textPrimary)
            }

            if let endTime = item.endTime {
                VStack(alignment: .leading, spacing: 2) {
                    Text("End")
                        .font(WWTypography.caption)
                        .foregroundStyle(WWTheme.textSecondary)
                    Text(endTime)
                        .font(WWTypography.headline)
                        .foregroundStyle(WWTheme.textPrimary)
                }
            }

            if let duration = item.durationMinutes {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Duration")
                        .font(WWTypography.caption)
                        .foregroundStyle(WWTheme.textSecondary)
                    Text("\(duration) min")
                        .font(WWTypography.headline)
                        .foregroundStyle(WWTheme.textPrimary)
                }
            }
        }
    }

    // MARK: - Details

    @ViewBuilder
    private var detailSection: some View {
        switch item.type {
        case .attraction:
            attractionDetails
        case .meal:
            mealDetails
        case .show:
            showDetails
        case .llReminder:
            llReminderDetails
        case .rest:
            EmptyView()
        case .walk:
            EmptyView()
        }
    }

    private var attractionDetails: some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing4) {
            if let waitTime = item.waitTimeMinutes {
                detailRow(label: "Estimated Wait", value: "\(waitTime) min")
            }
            if let height = item.heightRequirement {
                detailRow(label: "Height Requirement", value: height)
            }
            if item.isLightningLane {
                HStack(spacing: WWDesignTokens.spacing2) {
                    Image(systemName: "bolt.fill")
                        .foregroundStyle(WWTheme.accent)
                    Text("Lightning Lane")
                        .font(WWTypography.body)
                        .foregroundStyle(WWTheme.textPrimary)
                }
            }
        }
    }

    private var mealDetails: some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing4) {
            if let cuisine = item.cuisineType {
                detailRow(label: "Cuisine", value: cuisine)
            }
            if item.isMobileOrder {
                HStack(spacing: WWDesignTokens.spacing2) {
                    Image(systemName: "iphone")
                        .foregroundStyle(WWTheme.success)
                    Text("Mobile Order Available")
                        .font(WWTypography.body)
                        .foregroundStyle(WWTheme.textPrimary)
                }
            }
        }
    }

    private var showDetails: some View {
        HStack(spacing: WWDesignTokens.spacing2) {
            Image(systemName: "clock.fill")
                .foregroundStyle(WWTheme.primary)
            Text("Fixed showtime")
                .font(WWTypography.body)
                .foregroundStyle(WWTheme.textPrimary)
        }
    }

    private var llReminderDetails: some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing4) {
            if let window = item.bookingWindowTime {
                HStack(spacing: WWDesignTokens.spacing2) {
                    Image(systemName: "bell.fill")
                        .foregroundStyle(WWTheme.warning)
                    Text("Booking window opens at \(window)")
                        .font(WWTypography.body)
                        .foregroundStyle(WWTheme.textPrimary)
                }
            }
        }
    }

    // MARK: - Narrative

    private func narrativeSection(tip: String) -> some View {
        VStack(alignment: .leading, spacing: WWDesignTokens.spacing2) {
            Text("Tip")
                .font(WWTypography.caption)
                .foregroundStyle(WWTheme.textSecondary)
            Text(tip)
                .font(WWTypography.body)
                .foregroundStyle(WWTheme.textPrimary)
        }
        .padding(WWDesignTokens.spacing6)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                .fill(WWTheme.background)
        )
    }

    // MARK: - Walking

    private func walkingSection(minutes: Int) -> some View {
        HStack(spacing: WWDesignTokens.spacing2) {
            Image(systemName: "figure.walk")
                .foregroundStyle(WWTheme.textSecondary)
            Text("\(minutes) min walk to next item")
                .font(WWTypography.footnote)
                .foregroundStyle(WWTheme.textSecondary)
        }
    }

    // MARK: - Completion Toggle

    private var completionToggle: some View {
        Button(action: onToggleCompleted) {
            HStack(spacing: WWDesignTokens.spacing4) {
                Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(isCompleted ? WWTheme.success : WWTheme.textSecondary)

                Text(isCompleted ? "Completed" : "Mark as Done")
                    .font(WWTypography.body)
                    .foregroundStyle(WWTheme.textPrimary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(minHeight: WWDesignTokens.iconographyMinTapTarget)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(isCompleted ? "Mark as not completed" : "Mark as done")
    }

    // MARK: - Map Placeholder

    private var mapPlaceholder: some View {
        RoundedRectangle(cornerRadius: WWDesignTokens.radiusMd)
            .fill(WWTheme.muted)
            .frame(height: 150)
            .overlay {
                VStack(spacing: WWDesignTokens.spacing2) {
                    Image(systemName: "map")
                        .font(.title2)
                        .foregroundStyle(WWTheme.textSecondary)
                    Text("Map coming soon")
                        .font(WWTypography.caption)
                        .foregroundStyle(WWTheme.textSecondary)
                }
            }
            .accessibilityHidden(true)
    }

    // MARK: - Helpers

    private func detailRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(WWTypography.subheadline)
                .foregroundStyle(WWTheme.textSecondary)
            Spacer()
            Text(value)
                .font(WWTypography.body)
                .foregroundStyle(WWTheme.textPrimary)
        }
    }

    @ViewBuilder
    private var itemIcon: some View {
        switch item.type {
        case .attraction: Image(systemName: "star.fill")
        case .meal: Image(systemName: "fork.knife")
        case .show: Image(systemName: "calendar")
        case .llReminder: Image(systemName: "bell.fill")
        case .rest: Image(systemName: "bed.double.fill")
        case .walk: Image(systemName: "figure.walk")
        }
    }

    private var accentColor: Color {
        switch item.type {
        case .attraction: WWTheme.accent
        case .meal: WWTheme.success
        case .show: WWTheme.primary
        case .llReminder: WWTheme.warning
        case .rest: WWTheme.textSecondary
        case .walk: WWTheme.textSecondary
        }
    }

    private var typeLabel: String {
        switch item.type {
        case .attraction: "Attraction"
        case .meal: "Dining"
        case .show: "Show / Entertainment"
        case .llReminder: "Lightning Lane Reminder"
        case .rest: "Rest Break"
        case .walk: "Walking"
        }
    }
}

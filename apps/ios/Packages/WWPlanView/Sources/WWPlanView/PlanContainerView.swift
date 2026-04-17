import SwiftUI
import UIKit
import WWDesignSystem

/// Root plan view matching React Itinerary.tsx.
/// Fraunces "Your Trip" header, DayPillPicker, hint banner, DayTimelineView,
/// pull-to-refresh hint, WWEmptyState when no plan, bottom sheet detail on tap.
public struct PlanContainerView: View {

    @Bindable private var viewModel: PlanViewModel
    private let planId: String
    private let onUnlockTap: () -> Void
    private let onCreatePlan: () -> Void

    /// Controls hint banner visibility. Only shown once per install.
    @AppStorage("planView.hasSeenHintBanner") private var hasSeenHintBanner: Bool = false

    /// Index of the item selected for detail sheet.
    @State private var selectedItemIndex: Int?

    public init(
        viewModel: PlanViewModel,
        planId: String,
        onUnlockTap: @escaping () -> Void = {},
        onCreatePlan: @escaping () -> Void = {}
    ) {
        self.viewModel = viewModel
        self.planId = planId
        self.onUnlockTap = onUnlockTap
        self.onCreatePlan = onCreatePlan
    }

    public var body: some View {
        ZStack {
            WWTheme.background.ignoresSafeArea()

            Group {
                if viewModel.isLoading && viewModel.plan == nil {
                    loadingState
                } else if let errorMessage = viewModel.error, viewModel.plan == nil {
                    errorState(message: errorMessage)
                } else if viewModel.plan != nil {
                    planContent
                } else {
                    emptyState
                }
            }
        }
        .refreshable {
            // `planId` is actually a tripId passed from MainTabView — poll the trip
            // until the worker sets current_plan_id, then load the plan.
            await viewModel.loadPlanForTrip(tripId: planId)
        }
        .task {
            if viewModel.plan == nil {
                await viewModel.loadPlanForTrip(tripId: planId)
            }
        }
        .overlay {
            // Detail bottom sheet overlay
            if let index = selectedItemIndex,
               let day = viewModel.currentDay {
                let items = day.items
                    .filter { $0.type != .walk }
                    .sorted { $0.sortOrder < $1.sortOrder }
                if index < items.count {
                    PlanItemDetailView(
                        item: items[index],
                        parkColor: viewModel.parkColor(for: day),
                        onDismiss: { selectedItemIndex = nil },
                        onNavigate: { selectedItemIndex = nil },
                        onSwap: { selectedItemIndex = nil },
                        onSkip: {
                            viewModel.skipItem(items[index].id)
                            selectedItemIndex = nil
                        }
                    )
                }
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 0) {
            // Header
            headerView

            // Empty state body
            WWEmptyState(
                icon: "sparkles",
                title: "No Itinerary Yet",
                description: "Create your first trip to see your personalized day-by-day schedule with optimized timing and recommendations.",
                actionLabel: "Plan Your Trip",
                action: onCreatePlan
            )
        }
    }

    // MARK: - Plan Content

    @ViewBuilder
    private var planContent: some View {
        VStack(spacing: 0) {
            // Header
            headerView

            // Forecast banner
            if viewModel.plan?.forecastConfidence != nil {
                ForecastBanner()
                    .padding(.top, WWDesignTokens.spacing4)
            }

            // Day pill picker
            DayPillPicker(
                days: viewModel.days,
                selectedIndex: $viewModel.selectedDayIndex,
                parkColorForDay: { viewModel.parkColor(for: $0) }
            )
            .padding(.vertical, WWDesignTokens.spacing4)

            // Hint banner (shown once)
            if !hasSeenHintBanner {
                hintBanner
                    .padding(.horizontal, WWDesignTokens.spacing8)
                    .padding(.bottom, WWDesignTokens.spacing4)
            }

            // Timeline or locked overlay
            if let day = viewModel.currentDay {
                ZStack {
                    DayTimelineView(
                        day: day,
                        parkColor: viewModel.parkColor(for: day),
                        skippedItems: viewModel.skippedItems,
                        onTapItem: { index in
                            selectedItemIndex = index
                        },
                        onSkipItem: { id in
                            viewModel.skipItem(id)
                        },
                        onDoneItem: { id in
                            viewModel.markDone(id)
                        }
                    )

                    if day.isLocked {
                        LockedDayOverlay(onUnlockTap: onUnlockTap)
                    }

                    if viewModel.isRethinking {
                        RethinkLoadingView()
                    }
                }
            }

            // Pull-to-refresh hint at bottom
            pullToRefreshHint
                .padding(.horizontal, WWDesignTokens.spacing8)
                .padding(.bottom, WWDesignTokens.spacing8)
        }
        .overlay(alignment: .bottomTrailing) {
            if let day = viewModel.currentDay, !day.isLocked, !viewModel.isRethinking {
                rethinkButton
            }
        }
    }

    // MARK: - Header

    private var headerView: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Your Trip")
                .font(WWTypography.largeTitle)
                .foregroundStyle(WWTheme.textPrimary)

            if viewModel.plan != nil {
                Text("Disney World \u{2022} \(tripDatesText)")
                    .font(WWTypography.subheadline)
                    .foregroundStyle(WWTheme.textSecondary)
            } else {
                Text("Ready to create magic?")
                    .font(WWTypography.subheadline)
                    .foregroundStyle(WWTheme.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 24)
        .padding(.top, 32)
        .padding(.bottom, 16)
    }

    /// Derive trip dates from plan days.
    private var tripDatesText: String {
        guard let days = viewModel.plan?.days,
              let first = days.first,
              let last = days.last else {
            return ""
        }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "MMM d"

        let startStr = formatter.date(from: first.date).map { displayFormatter.string(from: $0) } ?? first.date
        let endStr = formatter.date(from: last.date).map { displayFormatter.string(from: $0) } ?? last.date
        return "\(startStr)-\(endStr)"
    }

    // MARK: - Hint Banner

    /// Gold-tinted hint card shown once per install.
    private var hintBanner: some View {
        HStack(spacing: 8) {
            Text("\u{1F4A1}")
                .font(.system(size: 16))

            Text("Tap cards for details \u{2022} Swipe to skip/complete")
                .font(WWTypography.caption)
                .foregroundStyle(WWTheme.textPrimary)

            Spacer()

            Button {
                hasSeenHintBanner = true
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(WWTheme.textSecondary)
            }
            .buttonStyle(.plain)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                .fill(
                    LinearGradient(
                        colors: [
                            WWDesignTokens.colorPrimitiveGold.opacity(0.1),
                            .clear
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                .stroke(WWDesignTokens.colorPrimitiveGold.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Pull to Refresh Hint

    private var pullToRefreshHint: some View {
        VStack(spacing: 4) {
            Text("Swipe down to re-optimize from current time")
                .font(WWTypography.caption)
                .foregroundStyle(WWTheme.textSecondary)

            Image(systemName: "chevron.down")
                .font(.system(size: 14))
                .foregroundStyle(WWDesignTokens.colorPrimitiveGold)
        }
        .frame(maxWidth: .infinity)
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusBase)
                .fill(
                    LinearGradient(
                        colors: [
                            WWDesignTokens.colorPrimitiveGold.opacity(0.1),
                            .clear
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusBase)
                .stroke(WWDesignTokens.colorPrimitiveGold.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Rethink Button

    private var rethinkButton: some View {
        Button {
            Task {
                await viewModel.rethinkToday()
                // Announce plan update to VoiceOver users
                UIAccessibility.post(
                    notification: .announcement,
                    argument: "Plan updated"
                )
            }
        } label: {
            HStack(spacing: WWDesignTokens.spacing2) {
                Image(systemName: "arrow.triangle.2.circlepath")
                    .font(.body.weight(.semibold))
                Text("Rethink")
                    .font(WWTypography.button)
            }
            .padding(.horizontal, WWDesignTokens.spacing8)
            .frame(minHeight: WWDesignTokens.iconographyMinTapTarget)
            .background(WWTheme.accent)
            .foregroundStyle(WWTheme.textOnAccent)
            .clipShape(Capsule())
            .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
        }
        .buttonStyle(.plain)
        .padding(WWDesignTokens.spacing8)
        .accessibilityLabel("Rethink my day")
    }

    // MARK: - Loading State

    private var loadingState: some View {
        VStack(spacing: WWDesignTokens.spacing6) {
            ProgressView()
                .tint(WWTheme.accent)
                .scaleEffect(1.2)
                .accessibilityHidden(true)
            Text("Your plan is being created...")
                .font(WWTypography.body)
                .foregroundStyle(WWTheme.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Loading. Your plan is being created.")
    }

    // MARK: - Error State

    private func errorState(message: String) -> some View {
        VStack(spacing: WWDesignTokens.spacing8) {
            Image(systemName: "exclamationmark.triangle")
                .font(.title)
                .foregroundStyle(WWTheme.warning)

            Text(message)
                .font(WWTypography.body)
                .foregroundStyle(WWTheme.textPrimary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, WWDesignTokens.spacing16)

            WWButton("Try Again") {
                Task {
                    await viewModel.loadPlan(planId: planId)
                }
            }
            .frame(maxWidth: 200)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

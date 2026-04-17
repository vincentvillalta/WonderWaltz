import SwiftUI
import UIKit
import WWDesignSystem

/// Root plan view with day tabs, forecast banner, timeline or locked overlay,
/// and rethink floating button. Uses NavigationStack for detail push.
public struct PlanContainerView: View {

    @Bindable private var viewModel: PlanViewModel
    private let planId: String
    private let onUnlockTap: () -> Void

    public init(
        viewModel: PlanViewModel,
        planId: String,
        onUnlockTap: @escaping () -> Void = {}
    ) {
        self.viewModel = viewModel
        self.planId = planId
        self.onUnlockTap = onUnlockTap
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                WWTheme.background.ignoresSafeArea()

                Group {
                    if viewModel.isLoading && viewModel.plan == nil {
                        loadingState
                    } else if let errorMessage = viewModel.error, viewModel.plan == nil {
                        errorState(message: errorMessage)
                    } else if viewModel.plan != nil {
                        planContent
                    }
                }
            }
            .navigationTitle("Your Plan")
            .navigationBarTitleDisplayMode(.inline)
            .refreshable {
                await viewModel.loadPlan(planId: planId)
            }
            .task {
                if viewModel.plan == nil {
                    await viewModel.loadPlan(planId: planId)
                }
            }
        }
    }

    // MARK: - Plan Content

    @ViewBuilder
    private var planContent: some View {
        VStack(spacing: 0) {
            // Forecast banner at top
            if viewModel.plan?.forecastConfidence != nil {
                ForecastBanner()
                    .padding(.top, WWDesignTokens.spacing4)
            }

            // Day tab picker
            DayTabPicker(
                days: viewModel.days,
                selectedIndex: $viewModel.selectedDayIndex
            )
            .padding(.vertical, WWDesignTokens.spacing4)

            Divider()

            // Timeline or locked overlay
            if let day = viewModel.currentDay {
                ZStack {
                    DayTimelineView(
                        day: day,
                        completedItemIds: viewModel.completedItemIds,
                        onToggleCompleted: { itemId in
                            viewModel.toggleItemCompleted(itemId)
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
        }
        .overlay(alignment: .bottomTrailing) {
            if let day = viewModel.currentDay, !day.isLocked, !viewModel.isRethinking {
                rethinkButton
            }
        }
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

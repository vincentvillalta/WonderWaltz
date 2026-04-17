import SwiftUI
import WWDesignSystem

/// Bottom sheet detail view matching React StopDetailSheet.tsx.
/// Spring animation, park-color time badge, hero gradient, height req card,
/// Pro Tip gold card, walk time card, navy "Start Navigation" CTA.
public struct PlanItemDetailView: View {

    public let item: PlanItemData
    public let parkColor: ParkColor
    public let onDismiss: () -> Void
    public let onNavigate: () -> Void
    public let onSwap: () -> Void
    public let onSkip: () -> Void

    public init(
        item: PlanItemData,
        parkColor: ParkColor,
        onDismiss: @escaping () -> Void = {},
        onNavigate: @escaping () -> Void = {},
        onSwap: @escaping () -> Void = {},
        onSkip: @escaping () -> Void = {}
    ) {
        self.item = item
        self.parkColor = parkColor
        self.onDismiss = onDismiss
        self.onNavigate = onNavigate
        self.onSwap = onSwap
        self.onSkip = onSkip
    }

    @State private var sheetOffset: CGFloat = UIScreen.main.bounds.height
    @State private var backdropOpacity: Double = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public var body: some View {
        ZStack(alignment: .bottom) {
            // Backdrop: black at 40% opacity, tappable to dismiss
            Color.black
                .opacity(backdropOpacity)
                .ignoresSafeArea()
                .onTapGesture { dismiss() }

            // Bottom sheet
            sheetContent
                .offset(y: max(sheetOffset, 0))
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            if value.translation.height > 0 {
                                sheetOffset = value.translation.height
                            }
                        }
                        .onEnded { value in
                            if value.translation.height > 150 {
                                dismiss()
                            } else {
                                animateIn()
                            }
                        }
                )
        }
        .onAppear { animateIn() }
        .accessibilityAddTraits(.isModal)
    }

    // MARK: - Sheet Content

    private var sheetContent: some View {
        GeometryReader { geo in
            VStack(spacing: 0) {
                // Handle: centered 40pt x 4pt capsule
                Capsule()
                    .fill(WWTheme.muted)
                    .frame(width: 40, height: 4)
                    .padding(.top, 12)
                    .padding(.bottom, 8)

                // Header
                headerSection
                    .padding(.horizontal, 24)
                    .padding(.bottom, 16)

                // Scrollable content
                ScrollView {
                    VStack(spacing: 16) {
                        // Hero image placeholder
                        heroPlaceholder

                        // Height requirement card
                        if let height = item.heightRequirement {
                            heightRequirementCard(height: height)
                        }

                        // Pro Tip card
                        if let tip = item.narrativeTip {
                            proTipCard(tip: tip)
                        }

                        // Walk time card
                        if let walkTime = item.walkTimeMinutes, walkTime > 0 {
                            walkTimeCard(minutes: walkTime)
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 16)
                }

                // Action buttons (pinned at bottom)
                actionButtons
                    .padding(24)
                    .background(
                        Rectangle()
                            .fill(WWTheme.surface)
                            .overlay(alignment: .top) {
                                Rectangle()
                                    .fill(WWTheme.border)
                                    .frame(height: 1)
                            }
                    )
            }
            .frame(maxHeight: geo.size.height * 0.85)
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .fill(WWTheme.surface)
            )
            .clipShape(
                UnevenRoundedRectangle(
                    topLeadingRadius: 24,
                    bottomLeadingRadius: 0,
                    bottomTrailingRadius: 0,
                    topTrailingRadius: 24
                )
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    // Badges row
                    HStack(spacing: 8) {
                        if item.isLightningLane {
                            Text("Lightning Lane")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(WWDesignTokens.colorPrimitiveNavy)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(
                                    RoundedRectangle(cornerRadius: 4)
                                        .fill(WWDesignTokens.colorPrimitiveGold)
                                )
                        }
                        if item.isADR {
                            Text("ADR")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(
                                    RoundedRectangle(cornerRadius: 4)
                                        .fill(WWDesignTokens.colorParkAnimalKingdom)
                                )
                        }
                    }

                    // Title: Fraunces title2 (22pt)
                    Text(item.name)
                        .font(WWTypography.title2)
                        .foregroundStyle(WWTheme.textPrimary)

                    // Location
                    HStack(spacing: 4) {
                        Image(systemName: "mappin")
                            .font(.system(size: 14))
                            .foregroundStyle(WWTheme.textSecondary)
                        Text(locationLabel)
                            .font(WWTypography.subheadline)
                            .foregroundStyle(WWTheme.textSecondary)
                    }
                }

                Spacer()

                // Close button: 36pt circle
                Button(action: dismiss) {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(WWTheme.textSecondary)
                        .frame(width: 36, height: 36)
                        .background(
                            Circle()
                                .fill(WWTheme.muted)
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Close")
            }

            // Time + stats row
            HStack(spacing: 8) {
                // Time badge: park-color tinted
                HStack(spacing: 6) {
                    Image(systemName: "clock")
                        .font(.system(size: 14))
                        .foregroundStyle(parkColor.color)
                    Text(item.startTime)
                        .font(WWTypography.subheadline.weight(.medium))
                        .foregroundStyle(WWTheme.textPrimary)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                        .fill(parkColor.color.opacity(0.08))
                )

                // Wait badge
                if let wait = item.waitTimeMinutes {
                    HStack(spacing: 6) {
                        Image(systemName: "person.2")
                            .font(.system(size: 14))
                            .foregroundStyle(WWTheme.textSecondary)
                        Text("\(wait) min wait")
                            .font(WWTypography.subheadline.weight(.medium))
                            .foregroundStyle(WWTheme.textPrimary)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                            .fill(WWTheme.muted)
                    )
                }

                // Duration badge
                if let duration = item.durationMinutes {
                    HStack(spacing: 6) {
                        Image(systemName: "clock")
                            .font(.system(size: 14))
                            .foregroundStyle(WWTheme.textSecondary)
                        Text("\(duration) min")
                            .font(WWTypography.subheadline.weight(.medium))
                            .foregroundStyle(WWTheme.textPrimary)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                            .fill(WWTheme.muted)
                    )
                }
            }
        }
    }

    // MARK: - Hero Placeholder

    /// Full-width, 192pt tall, rounded-2xl, gradient from parkColor/12% to parkColor/3%.
    private var heroPlaceholder: some View {
        RoundedRectangle(cornerRadius: WWDesignTokens.radiusBase)
            .fill(
                LinearGradient(
                    colors: [
                        parkColor.color.opacity(0.12),
                        parkColor.color.opacity(0.03)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .frame(height: 192)
            .overlay {
                Text(heroEmoji)
                    .font(.system(size: 64))
            }
    }

    private var heroEmoji: String {
        switch item.type {
        case .attraction: "\u{1F3A2}" // roller coaster
        case .meal: "\u{1F37D}\u{FE0F}" // plate with cutlery
        case .show: "\u{1F3AD}" // theater masks
        case .rest: "\u{2615}" // coffee
        case .llReminder: "\u{26A1}" // lightning
        case .walk: "\u{1F6B6}" // walking
        }
    }

    // MARK: - Height Requirement Card

    private func heightRequirementCard(height: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "person.2")
                .font(.system(size: 20))
                .foregroundStyle(WWDesignTokens.colorPrimitiveGold)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 4) {
                Text("Height Requirement")
                    .font(WWTypography.subheadline.weight(.medium))
                    .foregroundStyle(WWTheme.textPrimary)

                Text("Minimum \(height) tall to ride")
                    .font(WWTypography.subheadline)
                    .foregroundStyle(WWTheme.textSecondary)

                Divider()
                    .padding(.vertical, 4)

                // Per-guest check/cross list (placeholder with sample data)
                Text("\u{2713} Guests meeting height requirement can ride \u{2022} \u{2717} Shorter guests cannot ride")
                    .font(WWTypography.caption)
                    .foregroundStyle(WWTheme.textSecondary)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                .fill(WWTheme.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                .stroke(WWTheme.border, lineWidth: 1)
        )
    }

    // MARK: - Pro Tip Card

    /// Gold-tinted card: gold/10% bg, gold/20% border. Sparkles icon.
    private func proTipCard(tip: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "sparkles")
                .font(.system(size: 20))
                .foregroundStyle(WWDesignTokens.colorPrimitiveGold)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 4) {
                Text("Pro Tip")
                    .font(WWTypography.subheadline.weight(.medium))
                    .foregroundStyle(WWTheme.textPrimary)

                Text(tip)
                    .font(WWTypography.subheadline)
                    .foregroundStyle(WWTheme.textPrimary)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                .fill(WWDesignTokens.colorPrimitiveGold.opacity(0.1))
        )
        .overlay(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                .stroke(WWDesignTokens.colorPrimitiveGold.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Walk Time Card

    private func walkTimeCard(minutes: Int) -> some View {
        HStack(spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: "location.north")
                    .font(.system(size: 20))
                    .foregroundStyle(WWTheme.textSecondary)
                    .frame(width: 24)

                VStack(alignment: .leading, spacing: 2) {
                    Text("From previous stop")
                        .font(WWTypography.subheadline.weight(.medium))
                        .foregroundStyle(WWTheme.textPrimary)
                    Text("\(minutes) minute walk")
                        .font(WWTypography.caption)
                        .foregroundStyle(WWTheme.textSecondary)
                }
            }

            Spacer()

            Text("0.2 mi")
                .font(WWTypography.caption)
                .foregroundStyle(WWTheme.textSecondary)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                .fill(WWTheme.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                .stroke(WWTheme.border, lineWidth: 1)
        )
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        VStack(spacing: 8) {
            // Navy CTA: Start Navigation with shimmer
            WWButton("Start Navigation", style: .primary) {
                onNavigate()
            }

            // Two half-width buttons
            HStack(spacing: 8) {
                // Swap button (secondary)
                Button(action: onSwap) {
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.left.arrow.right")
                            .font(.system(size: 14))
                        Text("Swap")
                            .font(WWTypography.subheadline.weight(.medium))
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(
                        RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                            .fill(WWTheme.surface)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                            .stroke(WWTheme.border, lineWidth: 1)
                    )
                    .foregroundStyle(WWTheme.textPrimary)
                }
                .buttonStyle(.plain)

                // Skip button (red-tinted)
                Button(action: onSkip) {
                    HStack(spacing: 6) {
                        Image(systemName: "trash")
                            .font(.system(size: 14))
                        Text("Skip")
                            .font(WWTypography.subheadline.weight(.medium))
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(
                        RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                            .fill(WWTheme.surface)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: WWDesignTokens.radiusSm)
                            .stroke(WWDesignTokens.colorParkHollywoodStudios.opacity(0.2), lineWidth: 1)
                    )
                    .foregroundStyle(WWDesignTokens.colorParkHollywoodStudios)
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Helpers

    private var locationLabel: String {
        if item.type == .meal, let cuisine = item.cuisineType {
            return cuisine
        }
        switch item.type {
        case .attraction: return "Attraction"
        case .meal: return "Dining"
        case .show: return "Show"
        case .llReminder: return "Lightning Lane"
        case .rest: return "Break"
        case .walk: return "Walking"
        }
    }

    private func animateIn() {
        if reduceMotion {
            sheetOffset = 0
            backdropOpacity = 0.4
        } else {
            withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) {
                sheetOffset = 0
            }
            withAnimation(.easeOut(duration: 0.2)) {
                backdropOpacity = 0.4
            }
        }
    }

    private func dismiss() {
        if reduceMotion {
            sheetOffset = UIScreen.main.bounds.height
            backdropOpacity = 0
            onDismiss()
        } else {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.9)) {
                sheetOffset = UIScreen.main.bounds.height
            }
            withAnimation(.easeIn(duration: 0.2)) {
                backdropOpacity = 0
            }
            // Delay dismiss callback for animation to complete
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                onDismiss()
            }
        }
    }
}

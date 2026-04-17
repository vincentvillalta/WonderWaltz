import SwiftUI

/// Tab model for the WonderWaltz tab bar.
/// 3 tabs: Live (bolt.fill), Plan (calendar), Me (person.fill).
/// Matches React TabBar.tsx layout and behavior.
public enum WWTab: String, CaseIterable, Identifiable, Sendable {
    case live
    case plan
    case me

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .live: "Live"
        case .plan: "Plan"
        case .me: "Me"
        }
    }

    public var systemImage: String {
        switch self {
        case .live: "bolt.fill"
        case .plan: "calendar"
        case .me: "person.fill"
        }
    }
}

/// WonderWaltz tab bar with gold pill indicator and matched geometry animation.
/// Matches React TabBar.tsx: h-20, bg-card, border-t border-border, 3 tabs,
/// gold pill (E8B547/10%) on active tab, spring animation.
public struct WWTabBar: View {

    @Binding public var selectedTab: WWTab
    @Namespace private var tabNamespace
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(selectedTab: Binding<WWTab>) {
        self._selectedTab = selectedTab
    }

    public var body: some View {
        HStack(spacing: 0) {
            ForEach(WWTab.allCases) { tab in
                tabItem(tab)
            }
        }
        .frame(height: 80) // h-20 = 5rem = 80pt
        .background(WWTheme.cardBackground) // bg-card
        .overlay(alignment: .top) {
            // Top border: navy 10% opacity
            Rectangle()
                .fill(WWTheme.border)
                .frame(height: 1)
        }
        .safeAreaPadding(.bottom) // pb-safe
    }

    @ViewBuilder
    private func tabItem(_ tab: WWTab) -> some View {
        let isActive = selectedTab == tab

        Button {
            if reduceMotion {
                selectedTab = tab
            } else {
                withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
                    selectedTab = tab
                }
            }
        } label: {
            VStack(spacing: 4) { // gap-1 = 4pt
                Image(systemName: tab.systemImage)
                    .font(.system(size: 24, weight: isActive ? .bold : .regular)) // w-6 h-6, bold when active
                    .foregroundStyle(isActive ? WWTheme.primary : WWTheme.textSecondary)

                Text(tab.label)
                    .font(WWTypography.caption.weight(isActive ? .medium : .regular)) // text-xs
                    .foregroundStyle(isActive ? WWTheme.primary : WWTheme.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8) // py-2
            .padding(.horizontal, 24) // px-6
            .background {
                if isActive {
                    RoundedRectangle(cornerRadius: WWDesignTokens.radiusLg) // rounded-xl
                        .fill(WWDesignTokens.colorPrimitiveGold.opacity(0.1)) // bg-[#E8B547]/10
                        .matchedGeometryEffect(id: "tab-indicator", in: tabNamespace)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isActive ? [.isSelected, .isButton] : .isButton)
        .accessibilityLabel(tab.label)
    }
}

#Preview {
    struct PreviewWrapper: View {
        @State private var selected: WWTab = .live
        var body: some View {
            VStack {
                Spacer()
                WWTabBar(selectedTab: $selected)
            }
            .background(WWTheme.background)
        }
    }
    return PreviewWrapper()
}

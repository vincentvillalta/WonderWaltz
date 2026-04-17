import SwiftUI
import WWCore
import WWOnboarding
import WWDesignSystem
import WWTripWizard

/// Root navigation router that drives the splash -> onboarding -> main flow.
/// Uses `AppState.currentRoute` to determine which view to display.
struct AppRouter: View {

    @State private var appState: AppState

    init(appState: AppState) {
        _appState = State(initialValue: appState)
    }

    var body: some View {
        ZStack {
            routeContent

            if appState.showAuthBanner {
                authBanner
            }
        }
        .animation(.easeInOut(duration: 0.3), value: appState.currentRoute)
    }

    @ViewBuilder
    private var routeContent: some View {
        switch appState.currentRoute {
        case .splash:
            SplashView(onComplete: handleSplashComplete)

        case .onboarding:
            OnboardingContainerView(onComplete: handleOnboardingComplete)

        case .main:
            MainTabView()
        }
    }

    private var authBanner: some View {
        VStack {
            HStack {
                Image(systemName: "wifi.slash")
                    .font(.subheadline)
                Text(LocalizedStringKey(appState.authBannerMessage))
                    .font(WWTypography.subheadline)
                Spacer()
                Button {
                    withAnimation {
                        appState.showAuthBanner = false
                    }
                } label: {
                    Image(systemName: "xmark")
                        .font(.caption)
                }
                .accessibilityLabel(Text("Dismiss banner"))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(WWTheme.warning.opacity(0.9))
            .foregroundStyle(WWTheme.textPrimary)

            Spacer()
        }
        .transition(.move(edge: .top).combined(with: .opacity))
    }

    // MARK: - Navigation Handlers

    private func handleSplashComplete() {
        if appState.hasCompletedOnboarding {
            appState.currentRoute = .main
        } else {
            appState.currentRoute = .onboarding
        }
    }

    private func handleOnboardingComplete() {
        appState.hasCompletedOnboarding = true
        appState.currentRoute = .main
    }
}

// MainTabView is now in its own file: MainTabView.swift

import WWCore
import WWAnalytics

/// Bridge conformance: PostHogAnalyticsService -> AnalyticsProtocol.
/// This lives in the app target because WWAnalytics cannot import WWCore
/// (circular dependency). The app target sees both and can bridge.
extension PostHogAnalyticsService: @retroactive AnalyticsProtocol {}

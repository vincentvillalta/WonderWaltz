import Foundation
import Sentry

/// Crash reporting service wrapping Sentry Cocoa.
/// Call `initialize(dsn:)` BEFORE the first view renders.
public enum CrashReportingService: Sendable {

    /// Initialize Sentry crash reporting.
    /// - Parameter dsn: The Sentry DSN string.
    public static func initialize(dsn: String) {
        SentrySDK.start { options in
            options.dsn = dsn
            options.tracesSampleRate = 1.0
            options.enableCaptureFailedRequests = true
        }
    }
}

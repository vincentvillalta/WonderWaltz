import Foundation
import os

/// App-wide logger built on Apple's unified logging system (OSLog).
///
/// Debug builds: all levels emit to the console with file/line context.
/// Release builds: only `.error` and `.fault` are kept; `.debug`/`.info`/`.trace`
/// are compiled out via `#if DEBUG` so they add zero runtime cost.
///
/// Usage:
/// ```swift
/// WWLogger.networking.debug("POST /v1/trips")
/// WWLogger.auth.info("Anonymous user created: \(userId, privacy: .public)")
/// WWLogger.wizard.error("Submission failed: \(error.localizedDescription)")
/// ```
///
/// View logs in:
/// - Xcode console during development
/// - `Console.app` on macOS (filter by subsystem `com.wonderwaltz.app`)
/// - `log stream --predicate 'subsystem == "com.wonderwaltz.app"'` from Terminal
public enum WWLogger {

    /// Subsystem identifier — matches bundle ID for easy filtering.
    public static let subsystem: String = Bundle.main.bundleIdentifier ?? "com.wonderwaltz.app"

    // MARK: - Category Loggers

    /// Networking: API requests, responses, OpenAPI client traffic.
    public static let networking = Logger(subsystem: subsystem, category: "networking")

    /// Auth: anonymous session creation, token refresh, upgrade flows.
    public static let auth = Logger(subsystem: subsystem, category: "auth")

    /// Wizard: trip wizard state transitions, draft persistence, submission.
    public static let wizard = Logger(subsystem: subsystem, category: "wizard")

    /// Plan view: plan loading, day selection, rethink, locked overlay.
    public static let planView = Logger(subsystem: subsystem, category: "plan-view")

    /// Offline: SwiftData reads/writes, sync coordinator, package downloads.
    public static let offline = Logger(subsystem: subsystem, category: "offline")

    /// Onboarding: splash, permission requests, onboarding page flow.
    public static let onboarding = Logger(subsystem: subsystem, category: "onboarding")

    /// Analytics: PostHog/Sentry bridge events.
    public static let analytics = Logger(subsystem: subsystem, category: "analytics")

    /// App lifecycle: DI wiring, ModelContainer setup, launch sequence.
    public static let app = Logger(subsystem: subsystem, category: "app")

    /// General-purpose bucket for code that doesn't fit above categories.
    public static let general = Logger(subsystem: subsystem, category: "general")
}

// MARK: - Trace Helpers

public extension Logger {
    /// Fine-grained trace log — only compiled in DEBUG builds.
    /// Use for detailed execution traces that would be too noisy in release.
    @inlinable
    func trace(
        _ message: @autoclosure () -> String,
        file: StaticString = #fileID,
        line: UInt = #line,
        function: StaticString = #function
    ) {
        #if DEBUG
        let fileName = ("\(file)" as NSString).lastPathComponent
        let rendered = message()
        self.debug("[\(fileName, privacy: .public):\(line, privacy: .public) \(function, privacy: .public)] \(rendered, privacy: .public)")
        #endif
    }
}

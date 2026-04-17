// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "WWAnalytics",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "WWAnalytics", targets: ["WWAnalytics"]),
    ],
    dependencies: [
        .package(url: "https://github.com/getsentry/sentry-cocoa", exact: "8.44.0"),
        .package(url: "https://github.com/PostHog/posthog-ios", from: "3.24.0"),
    ],
    targets: [
        .target(
            name: "WWAnalytics",
            dependencies: [
                .product(name: "Sentry", package: "sentry-cocoa"),
                .product(name: "PostHog", package: "posthog-ios"),
            ]
        ),
    ]
)

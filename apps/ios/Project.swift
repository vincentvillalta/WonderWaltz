import ProjectDescription

let project = Project(
    name: "WonderWaltz",
    options: .options(
        defaultKnownRegions: ["en"],
        developmentRegion: "en"
    ),
    packages: [
        .local(path: "Packages/WWCore"),
        .local(path: "Packages/WWDesignSystem"),
        .local(path: "Packages/WWAnalytics"),
        .local(path: "Packages/WWOnboarding"),
        .local(path: "Packages/WWTripWizard"),
        .local(path: "Packages/WWPlanView"),
        .local(path: "Packages/WWOffline"),
    ],
    settings: .settings(
        base: [
            "SWIFT_STRICT_CONCURRENCY": "complete",
        ]
    ),
    targets: [
        .target(
            name: "WonderWaltz",
            destinations: .iOS,
            product: .app,
            bundleId: "com.wonderwaltz.app",
            deploymentTargets: .iOS("17.0"),
            infoPlist: .extendingDefault(with: [
                "CFBundleDisplayName": "WonderWaltz",
                "UILaunchStoryboardName": "LaunchScreen",
            ]),
            sources: ["WonderWaltz/**/*.swift"],
            resources: [
                "WonderWaltz/Assets.xcassets",
                "WonderWaltz/Resources/**",
            ],
            dependencies: [
                .package(product: "WWCore"),
                .package(product: "WWDesignSystem"),
                .package(product: "WWAnalytics"),
                .package(product: "WWOnboarding"),
                .package(product: "WWTripWizard"),
                .package(product: "WWPlanView"),
                .package(product: "WWOffline"),
            ],
            settings: .settings(
                base: [
                    "SWIFT_VERSION": "6.0",
                ]
            )
        ),
        .target(
            name: "WonderWaltzTests",
            destinations: .iOS,
            product: .unitTests,
            bundleId: "com.wonderwaltz.app.tests",
            deploymentTargets: .iOS("17.0"),
            sources: ["WonderWaltzTests/**/*.swift"],
            dependencies: [
                .target(name: "WonderWaltz"),
                .package(product: "WWCore"),
                .package(product: "WWDesignSystem"),
                .package(product: "WWAnalytics"),
                .package(product: "WWOnboarding"),
                .package(product: "WWTripWizard"),
                .package(product: "WWPlanView"),
                .package(product: "WWOffline"),
            ],
            settings: .settings(
                base: [
                    "SWIFT_VERSION": "6.0",
                ]
            )
        ),
    ]
)

// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "WWPlanView",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "WWPlanView", targets: ["WWPlanView"]),
    ],
    dependencies: [
        .package(path: "../WWCore"),
        .package(path: "../WWDesignSystem"),
    ],
    targets: [
        .target(
            name: "WWPlanView",
            dependencies: [
                .product(name: "WWCore", package: "WWCore"),
                .product(name: "WWDesignSystem", package: "WWDesignSystem"),
            ]
        ),
    ]
)

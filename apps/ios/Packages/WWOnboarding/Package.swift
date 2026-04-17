// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "WWOnboarding",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "WWOnboarding", targets: ["WWOnboarding"]),
    ],
    dependencies: [
        .package(path: "../WWCore"),
        .package(path: "../WWDesignSystem"),
    ],
    targets: [
        .target(
            name: "WWOnboarding",
            dependencies: [
                .product(name: "WWCore", package: "WWCore"),
                .product(name: "WWDesignSystem", package: "WWDesignSystem"),
            ]
        ),
    ]
)

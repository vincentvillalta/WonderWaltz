// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "WWTripWizard",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "WWTripWizard", targets: ["WWTripWizard"]),
    ],
    dependencies: [
        .package(path: "../WWCore"),
        .package(path: "../WWDesignSystem"),
    ],
    targets: [
        .target(
            name: "WWTripWizard",
            dependencies: [
                .product(name: "WWCore", package: "WWCore"),
                .product(name: "WWDesignSystem", package: "WWDesignSystem"),
            ]
        ),
    ]
)

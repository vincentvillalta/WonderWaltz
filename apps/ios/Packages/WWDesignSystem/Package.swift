// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "WWDesignSystem",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "WWDesignSystem", targets: ["WWDesignSystem"]),
    ],
    targets: [
        .target(
            name: "WWDesignSystem"
        ),
    ]
)

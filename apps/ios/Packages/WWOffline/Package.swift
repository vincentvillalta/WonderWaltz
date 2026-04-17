// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "WWOffline",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "WWOffline", targets: ["WWOffline"]),
    ],
    dependencies: [
        .package(path: "../WWCore"),
    ],
    targets: [
        .target(
            name: "WWOffline",
            dependencies: [
                .product(name: "WWCore", package: "WWCore"),
            ]
        ),
    ]
)

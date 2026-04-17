// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "WWCore",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "WWCore", targets: ["WWCore"]),
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-openapi-runtime", from: "1.7.0"),
        .package(url: "https://github.com/apple/swift-openapi-urlsession", from: "1.0.0"),
        .package(url: "https://github.com/kishikawakatsumi/KeychainAccess", from: "4.2.2"),
        .package(url: "https://github.com/apple/swift-http-types", from: "1.3.0"),
    ],
    targets: [
        .target(
            name: "WWCore",
            dependencies: [
                .product(name: "OpenAPIRuntime", package: "swift-openapi-runtime"),
                .product(name: "OpenAPIURLSession", package: "swift-openapi-urlsession"),
                .product(name: "KeychainAccess", package: "KeychainAccess"),
                .product(name: "HTTPTypes", package: "swift-http-types"),
            ]
        ),
    ]
)

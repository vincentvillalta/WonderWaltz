import Foundation
import HTTPTypes
import OpenAPIRuntime

/// Client middleware that injects `Authorization: Bearer {token}` header
/// on every outgoing request. Reads the token from the injected auth service.
public struct AuthMiddleware: ClientMiddleware, Sendable {

    private let tokenProvider: @Sendable () -> String?

    /// Initialize with a token provider closure.
    /// - Parameter tokenProvider: A closure that returns the current JWT token.
    public init(tokenProvider: @escaping @Sendable () -> String?) {
        self.tokenProvider = tokenProvider
    }

    public func intercept(
        _ request: HTTPRequest,
        body: HTTPBody?,
        baseURL: URL,
        operationID: String,
        next: @Sendable (HTTPRequest, HTTPBody?, URL) async throws -> (
            HTTPResponse, HTTPBody?
        )
    ) async throws -> (HTTPResponse, HTTPBody?) {
        var request = request
        if let token = tokenProvider() {
            request.headerFields[.authorization] = "Bearer \(token)"
        }
        return try await next(request, body, baseURL)
    }
}

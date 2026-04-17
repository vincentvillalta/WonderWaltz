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
        let hasToken = tokenProvider() != nil
        if let token = tokenProvider() {
            request.headerFields[.authorization] = "Bearer \(token)"
        }
        WWLogger.networking.trace("→ \(request.method.rawValue, privacy: .public) \(request.path ?? "", privacy: .public) op=\(operationID, privacy: .public) auth=\(hasToken ? "bearer" : "none", privacy: .public)")
        let start = Date()
        do {
            let (response, responseBody) = try await next(request, body, baseURL)
            let ms = Int(Date().timeIntervalSince(start) * 1000)
            WWLogger.networking.debug("← \(response.status.code, privacy: .public) \(request.path ?? "", privacy: .public) (\(ms, privacy: .public)ms)")
            return (response, responseBody)
        } catch {
            let ms = Int(Date().timeIntervalSince(start) * 1000)
            WWLogger.networking.error("✗ \(request.path ?? "", privacy: .public) (\(ms, privacy: .public)ms) \(error.localizedDescription, privacy: .public)")
            throw error
        }
    }
}

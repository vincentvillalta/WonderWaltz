import Foundation
import OpenAPIRuntime
import OpenAPIURLSession
import HTTPTypes

/// Concrete API client implementation using Swift OpenAPI Generator.
/// Conforms to `APIClientProtocol` for DI injection into feature packages.
///
/// The generated `Client` type handles serialization. This facade translates
/// generated response types to raw `Data` for protocol conformance, keeping
/// feature packages decoupled from generated types.
public final class APIClient: APIClientProtocol, @unchecked Sendable {

    private let client: Client
    private let encoder: JSONEncoder

    /// Initialize the API client.
    /// - Parameters:
    ///   - serverURL: The base URL of the API server.
    ///   - authMiddleware: Middleware for injecting auth headers.
    public init(
        serverURL: URL,
        authMiddleware: AuthMiddleware
    ) {
        let transport = URLSessionTransport()
        self.client = Client(
            serverURL: serverURL,
            transport: transport,
            middlewares: [authMiddleware]
        )
        self.encoder = JSONEncoder()
    }

    // MARK: - APIClientProtocol

    public func anonymousAuth() async throws -> String {
        let response = try await client.AuthController_anonymousAuth()
        switch response {
        case .ok(let output):
            switch output.body {
            case .json(let payload):
                // Extract access_token from the envelope response.
                // The generated type is a composite; encode to JSON then parse.
                let data = try encoder.encode(payload)
                guard let dict = try JSONSerialization.jsonObject(
                    with: data
                ) as? [String: Any] else {
                    throw APIClientError.decodingFailed
                }
                // Navigate envelope: { data: { access_token } }
                if let dataObj = dict["data"] as? [String: Any],
                   let token = dataObj["access_token"] as? String
                {
                    return token
                }
                if let token = dict["access_token"] as? String {
                    return token
                }
                throw APIClientError.decodingFailed
            }
        default:
            throw APIClientError.unexpectedResponse
        }
    }

    public func createTrip(_ body: Data) async throws -> Data {
        // TODO: Phase 5 plan 02+ — decode body into CreateTripDto
        // and call TripsController_createTrip with proper input.
        throw APIClientError.unexpectedResponse
    }

    public func getTrip(id: String) async throws -> Data {
        let response = try await client.TripsController_getTrip(
            path: .init(id: id)
        )
        switch response {
        case .ok(let output):
            switch output.body {
            case .json(let payload):
                return try encoder.encode(payload)
            }
        default:
            throw APIClientError.unexpectedResponse
        }
    }

    public func generatePlan(tripId: String) async throws -> Data {
        // TODO: Phase 5 plan 03+ — implement with proper input body.
        throw APIClientError.unexpectedResponse
    }

    public func getPlan(id: String) async throws -> Data {
        let response = try await client.PlansController_getPlan(
            path: .init(id: id)
        )
        switch response {
        case .ok(let output):
            switch output.body {
            case .json(let payload):
                return try encoder.encode(payload)
            }
        default:
            throw APIClientError.unexpectedResponse
        }
    }

    public func rethinkToday(tripId: String) async throws -> Data {
        // TODO: Phase 5 plan 04+ — implement with proper input.
        throw APIClientError.unexpectedResponse
    }

    public func getCurrentUser() async throws -> Data {
        let response = try await client.UsersController_getMe()
        switch response {
        case .ok(let output):
            switch output.body {
            case .json(let payload):
                return try encoder.encode(payload)
            }
        default:
            throw APIClientError.unexpectedResponse
        }
    }
}

/// Errors specific to the API client.
public enum APIClientError: Error, Sendable {
    case unexpectedResponse
    case decodingFailed
    case networkError(underlying: Error)
}

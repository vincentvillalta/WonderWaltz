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
        guard let dict = try? JSONSerialization.jsonObject(with: body) as? [String: Any] else {
            throw APIClientError.decodingFailed
        }

        let startDate = dict["startDate"] as? String ?? ""
        let endDate = dict["endDate"] as? String ?? ""

        // Map wizard guests to generated GuestInputDto.
        let guestDicts = dict["guests"] as? [[String: Any]] ?? []
        let guests: [Components.Schemas.GuestInputDto] = guestDicts.compactMap { g in
            guard let name = g["name"] as? String,
                  let ageStr = g["ageBracket"] as? String,
                  let ageBracket = Components.Schemas.GuestInputDto.age_bracketPayload(rawValue: ageStr)
            else { return nil }
            return Components.Schemas.GuestInputDto(
                name: name,
                age_bracket: ageBracket,
                has_das: g["hasDAS"] as? Bool ?? false
            )
        }

        // Map wizard budget tier to API enum.
        let budgetStr = dict["budgetTier"] as? String ?? "moderate"
        let budgetTier: Components.Schemas.TripPreferencesDto.budget_tierPayload
        switch budgetStr {
        case "budget": budgetTier = .pixie_dust
        case "premium": budgetTier = .royal_treatment
        default: budgetTier = .fairy_tale
        }

        let prefs = Components.Schemas.TripPreferencesDto(
            budget_tier: budgetTier,
            must_do_attraction_ids: dict["mustDoAttractionIds"] as? [String] ?? []
        )

        let dto = Components.Schemas.CreateTripDto(
            start_date: startDate,
            end_date: endDate,
            guests: guests,
            preferences: .init(value1: prefs)
        )

        let response = try await client.TripsController_createTrip(body: .json(dto))
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
        let response = try await client.TripsController_generatePlan(
            path: .init(id: tripId)
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
        let now = ISO8601DateFormatter().string(from: Date())
        let body = Components.Schemas.RethinkRequestDto(
            current_time: now,
            completed_item_ids: [],
            active_ll_bookings: []
        )
        let response = try await client.TripsController_rethinkToday(
            path: .init(id: tripId),
            body: .json(body)
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

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
    private let serverURL: URL
    private let tokenProvider: @Sendable () -> String?

    /// Initialize the API client.
    /// - Parameters:
    ///   - serverURL: The base URL of the API server.
    ///   - authMiddleware: Middleware for injecting auth headers.
    ///   - tokenProvider: Direct access to the bearer token, used for raw
    ///     URLSession fallbacks where the generated client would strip
    ///     unknown response fields.
    public init(
        serverURL: URL,
        authMiddleware: AuthMiddleware,
        tokenProvider: @escaping @Sendable () -> String? = { nil }
    ) {
        self.serverURL = serverURL
        self.tokenProvider = tokenProvider
        let transport = URLSessionTransport()
        self.client = Client(
            serverURL: serverURL,
            transport: transport,
            middlewares: [authMiddleware]
        )
        self.encoder = JSONEncoder()
        WWLogger.networking.debug("APIClient initialized with serverURL=\(serverURL.absoluteString, privacy: .public)")
    }

    // MARK: - APIClientProtocol

    public func anonymousAuth() async throws -> String {
        WWLogger.networking.trace("POST /v1/auth/anonymous — start")
        do {
            let response = try await client.AuthController_anonymousAuth()
            switch response {
            case .ok(let output):
                switch output.body {
                case .json(let payload):
                    let data = try encoder.encode(payload)
                    guard let dict = try JSONSerialization.jsonObject(
                        with: data
                    ) as? [String: Any] else {
                        WWLogger.networking.error("anonymousAuth: envelope decode failed")
                        throw APIClientError.decodingFailed
                    }
                    if let dataObj = dict["data"] as? [String: Any],
                       let token = dataObj["access_token"] as? String
                    {
                        WWLogger.networking.debug("anonymousAuth OK (token len=\(token.count))")
                        return token
                    }
                    if let token = dict["access_token"] as? String {
                        WWLogger.networking.debug("anonymousAuth OK (no envelope, token len=\(token.count))")
                        return token
                    }
                    WWLogger.networking.error("anonymousAuth: no access_token in response")
                    throw APIClientError.decodingFailed
                }
            default:
                WWLogger.networking.error("anonymousAuth: unexpected response status")
                throw APIClientError.unexpectedResponse
            }
        } catch {
            WWLogger.networking.error("anonymousAuth failed: \(error.localizedDescription, privacy: .public)")
            throw error
        }
    }

    public func createTrip(_ body: Data) async throws -> Data {
        WWLogger.networking.trace("POST /v1/trips — start (body size=\(body.count)B)")
        guard let dict = try? JSONSerialization.jsonObject(with: body) as? [String: Any] else {
            WWLogger.networking.error("createTrip: body is not valid JSON")
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

        do {
            let response = try await client.TripsController_createTrip(body: .json(dto))
            switch response {
            case .ok(let output):
                switch output.body {
                case .json(let payload):
                    WWLogger.networking.debug("createTrip OK (guests=\(guests.count), dates=\(startDate, privacy: .public)..\(endDate, privacy: .public))")
                    return try encoder.encode(payload)
                }
            default:
                WWLogger.networking.error("createTrip: unexpected response status")
                throw APIClientError.unexpectedResponse
            }
        } catch {
            WWLogger.networking.error("createTrip failed: \(error.localizedDescription, privacy: .public)")
            throw error
        }
    }

    public func getTrip(id: String) async throws -> Data {
        // Bypass the generated OpenAPI client — it strips fields not present
        // in the bundled TripDto struct, which blocks the iOS polling loop
        // from seeing server-side fields like current_plan_id. Raw URLSession
        // gives us the verbatim JSON body.
        //
        // Explicitly disable URLSession's response cache — polling loops need
        // the fresh body every call, not a cached snapshot from poll #1.
        WWLogger.networking.trace("GET /v1/trips/\(id, privacy: .public) (raw)")
        let url = serverURL.appendingPathComponent("v1/trips/\(id)")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        if let token = tokenProvider() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let status = (response as? HTTPURLResponse)?.statusCode ?? -1
            WWLogger.networking.error("getTrip: HTTP \(status, privacy: .public) for id=\(id, privacy: .public)")
            throw APIClientError.unexpectedResponse
        }
        return data
    }

    public func generatePlan(tripId: String) async throws -> Data {
        WWLogger.networking.trace("POST /v1/trips/\(tripId, privacy: .public)/generate-plan")
        let response = try await client.TripsController_generatePlan(
            path: .init(id: tripId)
        )
        switch response {
        case .ok(let output):
            switch output.body {
            case .json(let payload):
                WWLogger.networking.debug("generatePlan OK for tripId=\(tripId, privacy: .public)")
                return try encoder.encode(payload)
            }
        default:
            throw APIClientError.unexpectedResponse
        }
    }

    public func getPlan(id: String) async throws -> Data {
        WWLogger.networking.trace("GET /v1/plans/\(id, privacy: .public)")
        do {
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
                WWLogger.networking.error("getPlan: unexpected status for id=\(id, privacy: .public)")
                throw APIClientError.unexpectedResponse
            }
        } catch {
            WWLogger.networking.error("getPlan failed: \(error.localizedDescription, privacy: .public)")
            throw error
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

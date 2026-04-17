import Foundation

/// Protocol for the API client, abstracting the OpenAPI-generated client.
/// Feature packages depend on this protocol, never on the generated types directly.
public protocol APIClientProtocol: Sendable {

    /// Authenticate anonymously, returning a JWT token string.
    func anonymousAuth() async throws -> String

    /// Create a new trip from the given parameters, returning the created trip as raw JSON data.
    func createTrip(_ body: Data) async throws -> Data

    /// Retrieve a trip by its ID, returning raw JSON data.
    func getTrip(id: String) async throws -> Data

    /// Generate a plan for the given trip, returning raw JSON data.
    func generatePlan(tripId: String) async throws -> Data

    /// Retrieve a plan by its ID, returning raw JSON data.
    func getPlan(id: String) async throws -> Data

    /// Rethink today's plan for the given trip, returning raw JSON data.
    func rethinkToday(tripId: String) async throws -> Data

    /// Get the current user profile, returning raw JSON data.
    func getCurrentUser() async throws -> Data
}

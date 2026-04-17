import Foundation

/// NestJS API response envelope: `{ data: T, meta: { disclaimer: String } }`.
/// This helper unwraps the `data` field from the response envelope.

/// The envelope structure matching the NestJS response format.
public struct APIEnvelope<T: Decodable & Sendable>: Decodable, Sendable {
    public let data: T
    public let meta: APIEnvelopeMeta?
}

/// Metadata attached to every API response.
public struct APIEnvelopeMeta: Decodable, Sendable {
    public let disclaimer: String?
}

/// Unwrap the `data` field from a NestJS response envelope.
/// - Parameter responseData: The raw JSON response data.
/// - Returns: The decoded `data` value.
public func unwrapEnvelope<T: Decodable & Sendable>(
    _ responseData: Data
) throws -> T {
    let decoder = JSONDecoder()
    let envelope = try decoder.decode(APIEnvelope<T>.self, from: responseData)
    return envelope.data
}

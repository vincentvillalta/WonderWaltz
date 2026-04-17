import Foundation

/// Protocol for keychain-based secure storage.
public protocol KeychainStoreProtocol: Sendable {

    /// Save a JWT token to the keychain.
    func saveToken(_ token: String) throws

    /// Retrieve the stored JWT token, if any.
    func getToken() -> String?

    /// Delete the stored JWT token.
    func deleteToken() throws
}

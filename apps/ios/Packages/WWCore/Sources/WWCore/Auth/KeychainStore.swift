import Foundation
import KeychainAccess

/// Concrete keychain store using the KeychainAccess library.
/// Persists JWT tokens securely with `.whenUnlockedThisDeviceOnly` accessibility.
public final class KeychainStore: KeychainStoreProtocol, @unchecked Sendable {

    private static let tokenKey = "jwt_token"
    private let keychain: Keychain

    /// Initialize the keychain store.
    /// - Parameter service: The keychain service name.
    public init(service: String = "com.wonderwaltz.app") {
        self.keychain = Keychain(service: service)
            .accessibility(.whenUnlockedThisDeviceOnly)
    }

    public func saveToken(_ token: String) throws {
        try keychain.set(token, key: Self.tokenKey)
    }

    public func getToken() -> String? {
        try? keychain.get(Self.tokenKey)
    }

    public func deleteToken() throws {
        try keychain.remove(Self.tokenKey)
    }
}

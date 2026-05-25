import Foundation
import Security

enum KeychainStorage {
    private static let service = "com.peakadex.app"
    private static let tokenKey = "auth_token"

    static func save(token: String) {
        guard let data = token.data(using: .utf8) else { return }
        delete(key: tokenKey)
        let query: [CFString: Any] = [
            kSecClass:       kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: tokenKey,
            kSecValueData:   data
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    static func loadToken() -> String? {
        let query: [CFString: Any] = [
            kSecClass:            kSecClassGenericPassword,
            kSecAttrService:      service,
            kSecAttrAccount:      tokenKey,
            kSecReturnData:       true,
            kSecMatchLimit:       kSecMatchLimitOne
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8)
        else { return nil }
        return token
    }

    static func deleteToken() {
        delete(key: tokenKey)
    }

    private static func delete(key: String) {
        let query: [CFString: Any] = [
            kSecClass:       kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}

import Foundation

@Observable
final class AuthSession {
    private(set) var currentUser: User?
    private(set) var token: String?

    var isAuthenticated: Bool { token != nil }

    init() {
        restoreFromKeychain()
    }

    // Called after a successful login or register response
    func login(token: String, user: User) {
        self.token = token
        self.currentUser = user
        KeychainStorage.save(token: token)
        APIClient.shared.token = token
    }

    // Updates user data without changing the token (e.g. after profile edit)
    func updateUser(_ user: User) {
        currentUser = user
    }

    func logout() {
        token = nil
        currentUser = nil
        KeychainStorage.deleteToken()
        APIClient.shared.token = nil
    }

    private func restoreFromKeychain() {
        guard let saved = KeychainStorage.loadToken() else { return }
        token = saved
        APIClient.shared.token = saved
        // currentUser will be populated by the first /me call in the app
    }
}

import SwiftUI

struct RootView: View {
    @Environment(AuthSession.self) private var authSession

    var body: some View {
        if authSession.isAuthenticated {
            MainTabView()
        } else {
            // Phase 1 — LoginView goes here
            PlaceholderView(title: "Login", phase: 1)
        }
    }
}

import SwiftUI

@main
struct PeakadexApp: App {
    @State private var authSession = AuthSession()
    @State private var router = AppRouter()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(authSession)
                .environment(router)
        }
    }
}

import SwiftUI

// Centralized navigation paths for each tab.
// Each tab owns its own NavigationPath so deep links and
// back-stacks are independent between tabs.

@Observable
final class AppRouter {
    var homePath     = NavigationPath()
    var mapPath      = NavigationPath()
    var logbookPath  = NavigationPath()
    var socialPath   = NavigationPath()

    var selectedTab: Tab = .home
    var showNewAscent = false

    enum Tab: Int {
        case home, map, newAscent, logbook, social
    }

    func openNewAscent() {
        showNewAscent = true
    }

    func popToRoot(tab: Tab) {
        switch tab {
        case .home:    homePath    = NavigationPath()
        case .map:     mapPath     = NavigationPath()
        case .logbook: logbookPath = NavigationPath()
        case .social:  socialPath  = NavigationPath()
        case .newAscent: break
        }
    }
}

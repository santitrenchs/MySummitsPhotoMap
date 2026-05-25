import SwiftUI

struct MainTabView: View {
    @Environment(AppRouter.self) private var router

    var body: some View {
        @Bindable var router = router

        TabView(selection: $router.selectedTab) {

            // MARK: Home — Mi Progreso
            NavigationStack(path: $router.homePath) {
                PlaceholderView(title: "Mi Progreso", phase: 2)
            }
            .tabItem { Label("Mi Progreso", systemImage: "chart.bar.fill") }
            .tag(AppRouter.Tab.home)

            // MARK: Map — Atlas
            NavigationStack(path: $router.mapPath) {
                PlaceholderView(title: "Atlas", phase: 5)
            }
            .tabItem { Label("Atlas", systemImage: "map.fill") }
            .tag(AppRouter.Tab.map)

            // MARK: New Ascent — center CTA
            Text("") // empty — tap handled below
                .tabItem { Label("", systemImage: "plus.circle.fill") }
                .tag(AppRouter.Tab.newAscent)

            // MARK: Logbook — Bitácora
            NavigationStack(path: $router.logbookPath) {
                PlaceholderView(title: "Bitácora", phase: 3)
            }
            .tabItem { Label("Bitácora", systemImage: "book.fill") }
            .tag(AppRouter.Tab.logbook)

            // MARK: Social
            NavigationStack(path: $router.socialPath) {
                PlaceholderView(title: "Social", phase: 6)
            }
            .tabItem { Label("Social", systemImage: "person.2.fill") }
            .tag(AppRouter.Tab.social)
        }
        .tint(Color.peakGreenCTA)
        .onChange(of: router.selectedTab) { _, newTab in
            if newTab == .newAscent {
                router.selectedTab = .home
                router.openNewAscent()
            }
        }
        .sheet(isPresented: Bindable(router).showNewAscent) {
            // Phase 4 — NewAscentSheet goes here
            PlaceholderView(title: "Nueva Ascensión", phase: 4)
        }
    }
}

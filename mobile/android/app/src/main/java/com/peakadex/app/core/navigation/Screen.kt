package com.peakadex.app.core.navigation

sealed class Screen(val route: String) {
    // Startup
    data object Splash : Screen("splash")

    // Auth graph
    data object Login : Screen("login")
    data object Register : Screen("register")
    data object ForgotPassword : Screen("forgot_password")
    data object ResetPassword : Screen("reset_password/{token}") {
        fun createRoute(token: String) = "reset_password/$token"
    }

    // Main graph — tabs (4 tabs: Peakadex stats · Atlas · Bitácora · Cartas)
    data object Home : Screen("home")
    data object Map : Screen("map")
    data object Logbook : Screen("logbook")
    data object Cards : Screen("cards")

    // Detail screens (within tabs)
    data object AscentDetail : Screen("ascent/{id}") {
        fun createRoute(id: String) = "ascent/$id"
    }
    data object Profile : Screen("profile")
    data object Settings : Screen("settings")
}

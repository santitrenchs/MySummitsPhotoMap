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

    // Main graph — tabs (5 tabs: Stats · Cordada · Bitácora · Atlas · Cartas)
    data object Home : Screen("home")
    data object Map : Screen("map")
    data object Bitacora : Screen("bitacora")   // "Bitácora" tab — renders BitacoraScreen
    data object Cards : Screen("cards")          // "Cartas" tab — renders CardsScreen

    // Detail screens (within tabs)
    data object AscentDetail : Screen("ascent/{id}") {
        fun createRoute(id: String) = "ascent/$id"
    }
    data object Profile : Screen("profile")
    data object Settings : Screen("settings")
    data object Friends : Screen("friends")
    data object CordadaDetail : Screen("cordada/{id}") {
        fun createRoute(id: String) = "cordada/$id"
    }
    data object ChallengeDetail : Screen("challenge/{id}") {
        fun createRoute(id: String) = "challenge/$id"
    }
}

// ── Resultados devueltos a MainScaffold ───────────────────────────────────────
//
// Pantallas de detalle del NavHost externo (hoy el detalle de reto) que necesitan
// que MainScaffold haga algo al volver: abrir la hoja de alta con una cima puesta,
// o saltar al tab de Cards filtrado. Viajan por el savedStateHandle de la entrada
// de Main, que es el mecanismo estándar de Navigation Compose para devolver un
// resultado, en vez de un singleton o un ViewModel compartido.

const val RESULT_ACTION = "result_action"
const val RESULT_PEAK_ID = "result_peak_id"
const val RESULT_PEAK_NAME = "result_peak_name"

const val ACTION_LOG_ASCENT = "log_ascent"
const val ACTION_OPEN_CARDS = "open_cards"

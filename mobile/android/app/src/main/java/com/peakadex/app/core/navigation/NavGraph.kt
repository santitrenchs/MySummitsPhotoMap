package com.peakadex.app.core.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.peakadex.app.feature.auth.LoginScreen
import com.peakadex.app.feature.auth.RegisterScreen
import com.peakadex.app.feature.logbook.AscentDetailScreen
import com.peakadex.app.feature.splash.SplashScreen

@Composable
fun NavGraph(isAuthenticated: Boolean) {
    val navController = rememberNavController()

    NavHost(
        navController    = navController,
        startDestination = Screen.Splash.route,
    ) {
        // ── Splash (startup loading screen) ──────────────────────────────────

        composable(Screen.Splash.route) {
            SplashScreen(
                isAuthenticated = isAuthenticated,
                onReady = { authenticated ->
                    val destination = if (authenticated) Screen.Home.route else Screen.Login.route
                    navController.navigate(destination) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                },
            )
        }

        // ── Auth graph (Phase 1) ──────────────────────────────────────────────

        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onNavigateToRegister = {
                    navController.navigate(Screen.Register.route)
                },
            )
        }

        composable(Screen.Register.route) {
            RegisterScreen(
                onRegisterSuccess = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onNavigateToLogin = {
                    navController.popBackStack()
                },
            )
        }

        // ── Main tab bar (Phase 2+) ───────────────────────────────────────────

        composable(Screen.Home.route) {
            MainScaffold(navController = navController)
        }

        // ── Detail screens (no bottom nav) ────────────────────────────────────

        composable(Screen.AscentDetail.route) { backStackEntry ->
            val ascentId = backStackEntry.arguments?.getString("id") ?: return@composable
            AscentDetailScreen(
                ascentId = ascentId,
                onBack   = { navController.popBackStack() },
            )
        }
    }
}

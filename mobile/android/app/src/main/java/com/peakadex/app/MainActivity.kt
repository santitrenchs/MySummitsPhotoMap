package com.peakadex.app

import android.os.Bundle
import android.util.Log
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.peakadex.app.core.navigation.NavGraph
import com.peakadex.app.core.ui.theme.PeakadexTheme

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        // Must be called before super.onCreate() so the system picks up the splash theme
        installSplashScreen()
        super.onCreate(savedInstanceState)
        Log.d("MainActivity", "onCreate — appLocales=${AppCompatDelegate.getApplicationLocales()} configLocale=${resources.configuration.locales}")
        enableEdgeToEdge()
        val authSession = AppContainer.authSession
        setContent {
            PeakadexTheme {
                NavGraph(isAuthenticated = authSession.isAuthenticated)
            }
        }
    }
}

package com.peakadex.app

import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.peakadex.app.core.navigation.NavGraph
import com.peakadex.app.core.push.PushNavigation
import com.peakadex.app.core.ui.theme.PeakadexTheme

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        // Must be called before super.onCreate() so the system picks up the splash theme
        installSplashScreen()
        super.onCreate(savedInstanceState)
        Log.d("MainActivity", "onCreate — appLocales=${AppCompatDelegate.getApplicationLocales()} configLocale=${resources.configuration.locales}")
        enableEdgeToEdge()
        // App cerrada o en segundo plano: el aviso lo construyó el sistema y el
        // destino llega aquí, en el intent de lanzamiento.
        PushNavigation.handleIntent(intent)
        val authSession = AppContainer.authSession
        setContent {
            PeakadexTheme {
                NavGraph(isAuthenticated = authSession.isAuthenticated)
            }
        }
    }

    /**
     * App ya abierta. Llega por aquí gracias a los flags CLEAR_TOP|SINGLE_TOP del
     * PendingIntent; sin ellos se crearía una Activity nueva encima.
     */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        PushNavigation.handleIntent(intent)
    }
}

package com.peakadex.app.feature.splash

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.peakadex.app.core.ui.PeakadexLogo
import kotlinx.coroutines.delay

private const val MIN_SHOW_MS = 1_000L

@Composable
fun SplashScreen(isAuthenticated: Boolean, onReady: (authenticated: Boolean) -> Unit) {

    LaunchedEffect(Unit) {
        delay(MIN_SHOW_MS)
        onReady(isAuthenticated)
    }

    Box(
        modifier         = Modifier
            .fillMaxSize()
            .background(Color.White),
        contentAlignment = Alignment.Center,
    ) {
        PeakadexLogo(height = 44.dp)
    }
}

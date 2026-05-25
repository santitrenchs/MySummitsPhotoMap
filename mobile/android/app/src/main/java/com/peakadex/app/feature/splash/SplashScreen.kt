package com.peakadex.app.feature.splash

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// ── Rarity tiers — same order as web loading.tsx ──────────────────────────────

private val RARITIES = listOf(
    "Daisy"      to Color(0xFF00995C),
    "Heather"    to Color(0xFF06B6D4),
    "Gentian"    to Color(0xFF1E40AF),
    "Tundra"     to Color(0xFF0E7490),
    "Edelweiss"  to Color(0xFFA855F7),
    "Draba"      to Color(0xFFEC4899),
    "Saxifrage"  to Color(0xFFF97316),
    "Cinquefoil" to Color(0xFFEAB308),
    "Snow Lotus" to Color(0xFF94A3B8),
)

private val NavyDark = Color(0xFF0D2538)

// ── SplashScreen ──────────────────────────────────────────────────────────────
//
// Shown at startup on the same #0D2538 background as the Android system splash —
// the transition is invisible. After MIN_SHOW_MS the app navigates to Login or Home.

private const val MIN_SHOW_MS = 1_500L   // minimum visible time
private const val CYCLE_MS    = 700L     // ms between colour changes
private const val FADE_MS     = 300      // colour cross-fade duration

@Composable
fun SplashScreen(isAuthenticated: Boolean, onReady: (authenticated: Boolean) -> Unit) {

    // Colour cycle
    var rarityIndex by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) {
        // Run colour cycle and minimum wait in parallel inside a scoped block
        coroutineScope {
            val cycleJob = launch {
                while (true) {
                    delay(CYCLE_MS)
                    rarityIndex = (rarityIndex + 1) % RARITIES.size
                }
            }
            delay(MIN_SHOW_MS)
            cycleJob.cancel()
        }
        onReady(isAuthenticated)
    }

    val animatedColor by animateColorAsState(
        targetValue   = RARITIES[rarityIndex].second,
        animationSpec = tween(durationMillis = FADE_MS),
        label         = "rarityColor",
    )

    // Scale pulse: 1 → 1.15 → 1, mirrors CSS rarity-pulse keyframe (1.4s)
    val infiniteTransition = rememberInfiniteTransition(label = "rarityPulse")
    val scale by infiniteTransition.animateFloat(
        initialValue  = 1f,
        targetValue   = 1.15f,
        animationSpec = infiniteRepeatable(
            animation  = tween(durationMillis = 700, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "scale",
    )

    Box(
        modifier           = Modifier
            .fillMaxSize()
            .background(NavyDark),
        contentAlignment   = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text     = "✿",
                fontSize = 56.sp,
                color    = animatedColor,
                modifier = Modifier
                    .graphicsLayer(scaleX = scale, scaleY = scale)
                    .alpha(0.5f),
            )
            Text(
                text          = RARITIES[rarityIndex].first,
                fontSize      = 12.sp,
                fontWeight    = FontWeight.Bold,
                letterSpacing = 0.04.em,
                color         = animatedColor,
                modifier      = Modifier.alpha(0.45f),
            )
        }
    }
}

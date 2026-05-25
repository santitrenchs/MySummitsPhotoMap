package com.peakadex.app.core.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// ── Light scheme ───────────────────────────────────────────────────────────────
//
// primary = brand blue (PeakBlueActive) — used by FAB, NavigationBar indicator,
// progress bars and all interactive elements. Overrides the previous green primary
// so M3 tokens propagate the right colour automatically.

private val LightColorScheme = lightColorScheme(
    primary              = PeakBlueActive,
    onPrimary            = Color.White,
    primaryContainer     = PeakBlueContainer,   // sky-100: pill indicator, progress track
    onPrimaryContainer   = PeakBlueDark,        // sky-900: text on blue containers

    secondary            = PeakGreenCTA,        // brand green: secondary CTAs
    onSecondary          = Color.White,
    secondaryContainer   = Color(0xFFDCFCE7),   // green-100
    onSecondaryContainer = Color(0xFF166534),   // green-800

    background           = PeakBackground,
    onBackground         = PeakNavyDark,

    surface              = PeakSurface,         // card / sheet backgrounds = white
    onSurface            = PeakOnSurface,       // gray-700: primary text on cards

    surfaceVariant       = PeakSurfaceVariant,  // gray-100: dividers, inactive track
    onSurfaceVariant     = PeakMuted,           // gray-500: secondary labels, hints

    outline              = PeakBorderLight,
    outlineVariant       = PeakSurfaceVariant,
)

// ── Dark scheme ────────────────────────────────────────────────────────────────

private val DarkColorScheme = darkColorScheme(
    primary              = PeakBlueLight,       // sky-500: slightly lighter for dark bg
    onPrimary            = Color.White,
    primaryContainer     = PeakBlueActive,      // sky-700: pill on dark
    onPrimaryContainer   = Color(0xFFE0F2FE),   // sky-100: text on dark pill

    secondary            = PeakBrandGreen,
    onSecondary          = Color.White,

    background           = PeakNavyDark,
    onBackground         = PeakBackground,

    surface              = Color(0xFF1A2F42),
    onSurface            = PeakBackground,

    surfaceVariant       = Color(0xFF243545),
    onSurfaceVariant     = PeakNavyLight,

    outline              = PeakNavyMid,
    outlineVariant       = Color(0xFF1E3347),
)

// ── Theme entry point ──────────────────────────────────────────────────────────

@Composable
fun PeakadexTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography  = PeakadexTypography,
        content     = content,
    )
}

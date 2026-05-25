package com.peakadex.app.core.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.peakadex.app.R

// ── Font families ──────────────────────────────────────────────────────────────
//
// We ship Manrope ExtraBold for branding (logos, display numbers, card titles).
// All other weights fall back to the system font (Roboto) which M3 uses by
// default — this keeps body text readable at all sizes without shipping a full
// font family.

val ManropeExtraBold = FontFamily(
    Font(R.font.manrope_extrabold, FontWeight.ExtraBold)
)

// ── Type scale ─────────────────────────────────────────────────────────────────
//
// Display  → hero numbers (total ascents counter, big stats)
// Headline → screen-level headings (not currently used, reserved)
// Title    → card titles, level names, section names
// Body     → list rows, descriptions         → system font
// Label    → chips, tab labels, captions     → system font

val PeakadexTypography = Typography(

    // Display — the big "42 cimas" counter in SummitHeroCard
    displaySmall = TextStyle(
        fontFamily   = ManropeExtraBold,
        fontWeight   = FontWeight.ExtraBold,
        fontSize     = 48.sp,
        lineHeight   = 48.sp,
        letterSpacing = (-1.5).sp,
    ),

    // Headline — section headers, leaderboard title
    headlineSmall = TextStyle(
        fontFamily   = ManropeExtraBold,
        fontWeight   = FontWeight.ExtraBold,
        fontSize     = 20.sp,
        lineHeight   = 26.sp,
        letterSpacing = (-0.3).sp,
    ),

    // Title large — level name, card primary title
    titleLarge = TextStyle(
        fontFamily   = ManropeExtraBold,
        fontWeight   = FontWeight.ExtraBold,
        fontSize     = 17.sp,
        lineHeight   = 22.sp,
        letterSpacing = (-0.3).sp,
    ),

    // Title medium — KPI values, leaderboard ascent count
    titleMedium = TextStyle(
        fontFamily   = ManropeExtraBold,
        fontWeight   = FontWeight.ExtraBold,
        fontSize     = 15.sp,
        lineHeight   = 20.sp,
        letterSpacing = (-0.1).sp,
    ),

    // Title small — section headers ("Tu posición en la cordada")
    titleSmall = TextStyle(
        fontFamily   = ManropeExtraBold,
        fontWeight   = FontWeight.ExtraBold,
        fontSize     = 13.sp,
        lineHeight   = 18.sp,
        letterSpacing = (-0.1).sp,
    ),

    // Body + Label — system font (Roboto); M3 defaults apply
    // bodyLarge / bodyMedium / bodySmall / labelLarge / labelMedium / labelSmall
    // left as default so they inherit Roboto and proper M3 sizing
)

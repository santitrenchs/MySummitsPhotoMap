package com.peakadex.app.core.ui

import androidx.compose.ui.graphics.Color
import com.peakadex.app.core.ui.theme.PeakNavyLight

// ── Shared rarity palette ──────────────────────────────────────────────────────
//
// Single source of truth for the 9 rarity tiers used across HomeScreen (charts)
// and CardsScreen. Previously duplicated as private RarityMeta /
// RarityDef in each screen — any colour change now only needs updating here.

data class RarityInfo(
    val id:     String,
    val label:  String,
    val color:  Color,
    val minAlt: Int,
    val ep:     Int,
)

val RARITY_PALETTE: List<RarityInfo> = listOf(
    RarityInfo("daisy",      "Daisy",      Color(0xFF00995C), 0,    10),
    RarityInfo("heather",    "Heather",    Color(0xFF06B6D4), 1000, 20),
    RarityInfo("gentian",    "Gentian",    Color(0xFF1E40AF), 2000, 30),
    RarityInfo("tundra",     "Tundra",     Color(0xFF0E7490), 3000, 60),
    RarityInfo("edelweiss",  "Edelweiss",  Color(0xFFA855F7), 4000, 120),
    RarityInfo("draba",      "Draba",      Color(0xFFEC4899), 5000, 250),
    RarityInfo("saxifrage",  "Saxifrage",  Color(0xFFF97316), 6000, 500),
    RarityInfo("cinquefoil", "Cinquefoil", Color(0xFFEAB308), 7000, 1000),
    RarityInfo("snow_lotus", "Snow Lotus", PeakNavyLight,     8000, 2000),
)

/** Returns the highest rarity whose [minAlt] is ≤ [altitudeM], or Daisy if none. */
fun rarityForAltitude(altitudeM: Int): RarityInfo =
    RARITY_PALETTE.lastOrNull { altitudeM >= it.minAlt } ?: RARITY_PALETTE.first()

package com.peakadex.app.core.ui

import androidx.compose.ui.graphics.Color

// ── Shared level system — single source of truth ────────────────────────────────
//
// Mirrors lib/level-utils.ts LEVEL_DEFS. The SERVER owns the computed 1-based
// levelIdx (1 = Scout base … 6 = Zenith); clients only display name/emoji/accent
// and, on HomeScreen, the progression thresholds.
//
// Previously duplicated across HomeScreen (LocalLevelDef/LEVEL_DEFS/LEVEL_ACCENT),
// CordadasTab (LEVEL_NAMES/LEVEL_EMOJIS) and FriendsScreen (STATS_LEVEL_NAMES).
// Any change to names, emojis, thresholds or accent colours now lives here only.

data class LevelAltReq(val threshold: Int, val count: Int)

data class LevelDef(
    val idx: Int,                          // 1-based, matches server levelIdx
    val emoji: String,
    val name: String,
    val targetPeaks: Int = 0,              // 0 = no requirement (base level)
    val altReqs: List<LevelAltReq> = emptyList(),
    val accent: Color,                     // matches web LEVEL_COLORS
)

val LEVEL_DEFS: List<LevelDef> = listOf(
    LevelDef(1, "🌱", "Scout",                                              accent = Color(0xFF16A34A)),  // base — always met
    LevelDef(2, "🥾", "Guide",    20,  listOf(LevelAltReq(2000, 1)), accent = Color(0xFFD97706)),
    LevelDef(3, "🧭", "Explorer", 50,  listOf(LevelAltReq(3000, 1)), accent = Color(0xFFEA580C)),
    LevelDef(4, "⛰️", "Alpinist", 100, listOf(LevelAltReq(4000, 1)), accent = Color(0xFF1D4ED8)),
    LevelDef(5, "🏔️", "Master",   150, listOf(LevelAltReq(5000, 1)), accent = Color(0xFF7C3AED)),
    LevelDef(6, "👑", "Zenith",   220, listOf(LevelAltReq(6500, 1)), accent = Color(0xFFB45309)),
)

/** 1-based levelIdx → LevelDef, clamped to the base level when out of range. */
fun levelDefForIdx(levelIdx: Int): LevelDef =
    LEVEL_DEFS.getOrNull(levelIdx - 1) ?: LEVEL_DEFS.first()

/** 1-based levelIdx → display name. Falls back to base level. */
fun levelName(levelIdx: Int): String = levelDefForIdx(levelIdx).name

/** 1-based levelIdx → emoji. Falls back to base level. */
fun levelEmoji(levelIdx: Int): String = levelDefForIdx(levelIdx).emoji

/** 1-based levelIdx → accent colour. Falls back to base level. */
fun levelAccent(levelIdx: Int): Color = levelDefForIdx(levelIdx).accent

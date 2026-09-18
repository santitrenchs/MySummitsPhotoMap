package com.peakadex.app.core.util

import kotlin.math.roundToInt

// ─── Units ───────────────────────────────────────────────────────────────────
//
// Mirror of web `lib/units.ts`. Every altitude and distance the app prints goes
// through here; before this file the " m" was hand-written at a dozen places.
//
// The [units] argument is the whole point: there is no user preference yet, so
// every caller gets metric. When the preference lands it is threaded into these
// functions instead of into every call site.
//
// ⚠️ Altitude is not only a display value: the rarity tiers and the level
// requirements are DEFINED in metres, and so is the identity of several
// challenges. Converting a tier boundary for display gives "Tundra: 9,843 ft+",
// which is not a boundary anyone recognises. That needs a product decision.

enum class Units { METRIC, IMPERIAL }

private const val FEET_PER_METRE = 3.28084
private const val MILES_PER_KM = 0.621371

fun metresToFeet(m: Int): Int = (m * FEET_PER_METRE).roundToInt()

/** "3404 m" · "11168 ft". */
fun formatAltitude(altitudeM: Int, units: Units = Units.METRIC): String =
    if (units == Units.IMPERIAL) "${metresToFeet(altitudeM)} ft" else "$altitudeM m"

/** "850 m" / "12.4 km" — how far a peak is from the map centre. */
fun formatDistance(km: Double, units: Units = Units.METRIC): String {
    if (units == Units.IMPERIAL) {
        val miles = km * MILES_PER_KM
        return if (miles < 1.0) "${metresToFeet((km * 1000).toInt())} ft"
               else "${"%.1f".format(miles)} mi"
    }
    return if (km < 1.0) "${(km * 1000).toInt()} m" else "${"%.1f".format(km)} km"
}

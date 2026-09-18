package com.peakadex.app.core.util

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlin.math.roundToInt

// ─── Units ───────────────────────────────────────────────────────────────────
//
// Mirror of web `lib/units.ts`. Every altitude and distance the app prints goes
// through here; before this file the " m" was hand-written at a dozen places.
//
// The preference lives in [UnitsState], restored from TokenStorage at start-up
// and refreshed from the settings API, so call sites do not thread it down.
//
// ⚠️ Altitude is not only a display value: the rarity tiers and the level
// requirements are DEFINED in metres, and so is the identity of several
// challenges. Converting a tier boundary for display gives "Tundra: 9,843 ft+",
// which is not a boundary anyone recognises. That needs a product decision.

enum class Units { METRIC, IMPERIAL }

/**
 * The signed-in user's preference, restored by [com.peakadex.app.core.auth.AuthSession]
 * before the first frame. A phone has exactly one user, so a process-wide value is
 * safe here in a way it would not be on the server.
 *
 * It is Compose snapshot state, so a composable that formats an altitude
 * recomposes when this changes — that is why the formatters below can default to
 * it instead of every call site threading it down.
 */
object UnitsState {
    var current by mutableStateOf(Units.METRIC)

    fun set(raw: String?) {
        current = if (raw == "imperial") Units.IMPERIAL else Units.METRIC
    }
}

private const val FEET_PER_METRE = 3.28084
private const val MILES_PER_KM = 0.621371

fun metresToFeet(m: Int): Int = (m * FEET_PER_METRE).roundToInt()

/** "3404 m" · "11168 ft". */
fun formatAltitude(altitudeM: Int, units: Units = UnitsState.current): String =
    if (units == Units.IMPERIAL) "${metresToFeet(altitudeM)} ft" else "$altitudeM m"

/** Just the number — for the few places that render value and unit apart. */
fun altitudeValue(altitudeM: Int, units: Units = UnitsState.current): String =
    if (units == Units.IMPERIAL) "${metresToFeet(altitudeM)}" else "$altitudeM"

fun altitudeUnit(units: Units = UnitsState.current): String =
    if (units == Units.IMPERIAL) "ft" else "m"

/** "850 m" / "12.4 km" — how far a peak is from the map centre. */
fun formatDistance(km: Double, units: Units = UnitsState.current): String {
    if (units == Units.IMPERIAL) {
        val miles = km * MILES_PER_KM
        return if (miles < 1.0) "${metresToFeet((km * 1000).toInt())} ft"
               else "${oneDecimal(miles)} mi"
    }
    return if (km < 1.0) "${(km * 1000).toInt()} m" else "${oneDecimal(km)} km"
}

/** One decimal under 10, none above, and never a bare ".0". */
private fun oneDecimal(n: Double): String {
    if (n >= 10.0) return "${Math.round(n)}"
    val r = Math.round(n * 10) / 10.0
    return if (r == Math.floor(r)) "${r.toInt()}" else "%.1f".format(r)
}

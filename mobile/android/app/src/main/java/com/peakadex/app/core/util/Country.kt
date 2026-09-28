package com.peakadex.app.core.util

import android.content.res.Resources
import androidx.core.os.ConfigurationCompat
import org.maplibre.android.geometry.LatLngBounds
import java.text.Collator
import java.util.Locale

// ─── Country ─────────────────────────────────────────────────────────────────
//
// Mirror of web `lib/country.ts`. `User.country` is an ISO 3166-1 alpha-2 code
// or null. Private and optional: inferred once at sign-up from the phone's
// locale, editable in Settings. Today it only decides where the Atlas opens for
// someone with no ascents yet.
//
// ⚠️ Keep COUNTRY_BOUNDS and SUGGESTED_COUNTRIES in sync with the web file.

private val ISO_CODES: Set<String> = Locale.getISOCountries().toSet()

/** A valid upper-cased ISO code, or null. Numeric regions (`419`) are not countries. */
internal fun normalizeCountry(value: String?): String? {
    val code = value?.trim()?.uppercase(Locale.ROOT) ?: return null
    if (code.length != 2 || !code.all { it in 'A'..'Z' }) return null
    // `XK` (Kosovo) is not in Java's ISO list but the web accepts it.
    return if (code in ISO_CODES || code == "XK") code else null
}

/**
 * The region of the DEVICE's primary locale, or null.
 *
 * Reads the system configuration, not `Locale.getDefault()`: once the user picks
 * an app language in Settings (`AppCompatDelegate.setApplicationLocales("ca")`)
 * the default locale becomes the bare app language, with no region, and we would
 * lose the country the phone actually reports.
 */
fun detectCountry(): String? {
    val system = runCatching {
        ConfigurationCompat.getLocales(Resources.getSystem().configuration)[0]
    }.getOrNull()
    return normalizeCountry((system ?: Locale.getDefault()).country)
}

/**
 * Countries to list first in the picker, keyed by app language — so a Spanish
 * speaker finds Spain at the top even when no region was detected.
 */
val SUGGESTED_COUNTRIES: Map<String, List<String>> = mapOf(
    "es" to listOf("ES", "MX", "AR", "CO", "CL", "PE"),
    "ca" to listOf("ES", "AD", "FR"),
    "en" to listOf("GB", "US", "IE", "CA", "AU", "NZ"),
    "fr" to listOf("FR", "BE", "CH", "CA"),
    "de" to listOf("DE", "AT", "CH"),
)

/**
 * `[west, south, east, north]` of each country's MAIN territory. Deliberately
 * not the official extent (Spain without the Canaries, the US without Alaska):
 * the official box would open on a map mostly made of ocean. Missing countries
 * (and those straddling the antimeridian, like Russia) return null.
 */
internal val COUNTRY_BOUNDS: Map<String, DoubleArray> = mapOf(
    // Europe
    "AD" to doubleArrayOf(1.40, 42.43, 1.79, 42.66),
    "AT" to doubleArrayOf(9.53, 46.37, 17.16, 49.02),
    "BE" to doubleArrayOf(2.54, 49.50, 6.41, 51.51),
    "CH" to doubleArrayOf(5.95, 45.82, 10.49, 47.81),
    "CZ" to doubleArrayOf(12.09, 48.55, 18.86, 51.06),
    "DE" to doubleArrayOf(5.87, 47.27, 15.04, 55.06),
    "ES" to doubleArrayOf(-9.39, 35.95, 4.33, 43.79),
    "FI" to doubleArrayOf(20.55, 59.81, 31.59, 70.09),
    "FR" to doubleArrayOf(-5.14, 41.33, 9.56, 51.09),
    "GB" to doubleArrayOf(-8.18, 49.87, 1.77, 60.86),
    "GR" to doubleArrayOf(19.37, 34.80, 28.25, 41.75),
    "HR" to doubleArrayOf(13.49, 42.39, 19.45, 46.55),
    "IE" to doubleArrayOf(-10.48, 51.42, -5.99, 55.39),
    "IS" to doubleArrayOf(-24.55, 63.29, -13.49, 66.57),
    "IT" to doubleArrayOf(6.63, 36.62, 18.52, 47.09),
    "NL" to doubleArrayOf(3.36, 50.75, 7.23, 53.56),
    "NO" to doubleArrayOf(4.64, 57.96, 31.08, 71.19),
    "PL" to doubleArrayOf(14.12, 49.00, 24.15, 54.84),
    "PT" to doubleArrayOf(-9.53, 36.96, -6.19, 42.15),
    "RO" to doubleArrayOf(20.26, 43.62, 29.69, 48.27),
    "SE" to doubleArrayOf(11.11, 55.34, 24.17, 69.06),
    "SI" to doubleArrayOf(13.38, 45.42, 16.61, 46.88),
    "SK" to doubleArrayOf(16.83, 47.73, 22.56, 49.61),
    // Americas
    "AR" to doubleArrayOf(-73.56, -55.06, -53.64, -21.78),
    "BO" to doubleArrayOf(-69.64, -22.90, -57.45, -9.68),
    "CA" to doubleArrayOf(-141.00, 41.68, -52.62, 70.00),
    "CL" to doubleArrayOf(-75.70, -55.92, -66.42, -17.50),
    "CO" to doubleArrayOf(-79.00, -4.23, -66.87, 12.46),
    "EC" to doubleArrayOf(-81.08, -5.01, -75.19, 1.45),
    "MX" to doubleArrayOf(-117.13, 14.53, -86.71, 32.72),
    "PE" to doubleArrayOf(-81.33, -18.35, -68.65, -0.04),
    "US" to doubleArrayOf(-124.85, 24.40, -66.88, 49.38),
    // Asia and the Caucasus
    "AM" to doubleArrayOf(43.45, 38.84, 46.63, 41.30),
    "CN" to doubleArrayOf(73.50, 18.16, 134.77, 53.56),
    "GE" to doubleArrayOf(40.01, 41.05, 46.72, 43.59),
    "IN" to doubleArrayOf(68.11, 6.75, 97.40, 35.50),
    "JP" to doubleArrayOf(129.41, 31.03, 145.54, 45.55),
    "KG" to doubleArrayOf(69.28, 39.17, 80.28, 43.27),
    "KZ" to doubleArrayOf(46.49, 40.57, 87.36, 55.44),
    "NP" to doubleArrayOf(80.06, 26.35, 88.20, 30.45),
    "PK" to doubleArrayOf(60.87, 23.69, 77.84, 37.10),
    "TJ" to doubleArrayOf(67.39, 36.67, 75.15, 41.04),
    "TR" to doubleArrayOf(25.98, 35.82, 44.82, 42.11),
    "UZ" to doubleArrayOf(55.99, 37.18, 73.13, 45.59),
    // Africa and Oceania
    "AU" to doubleArrayOf(113.34, -43.64, 153.57, -10.67),
    "KE" to doubleArrayOf(33.91, -4.68, 41.90, 5.02),
    "MA" to doubleArrayOf(-13.17, 27.66, -1.01, 35.92),
    "NZ" to doubleArrayOf(166.43, -47.29, 178.55, -34.39),
    "TZ" to doubleArrayOf(29.33, -11.75, 40.44, -0.99),
    "ZA" to doubleArrayOf(16.45, -34.84, 32.89, -22.13),
)

/** Framing box for the Atlas, or null when the country is unknown or not in the table. */
fun countryBounds(code: String?): LatLngBounds? {
    val b = COUNTRY_BOUNDS[code?.uppercase(Locale.ROOT) ?: return null] ?: return null
    val (west, south, east, north) = b.toList()
    // ⚠️ MapLibre's order is north, east, south, west — the reverse of the table.
    return LatLngBounds.from(north, east, south, west)
}

/** Localized country name. Falls back to the code when the platform has no name. */
fun countryName(code: String, locale: Locale): String =
    Locale("", code).getDisplayCountry(locale).ifBlank { code }

/** Every selectable code, sorted by its localized name (accent-insensitive). */
fun allCountriesSorted(locale: Locale): List<String> {
    val collator = Collator.getInstance(locale).apply { strength = Collator.PRIMARY }
    return (ISO_CODES + "XK")
        .sortedWith { a, b -> collator.compare(countryName(a, locale), countryName(b, locale)) }
}

/**
 * Suggested codes for the app language, with the detected/current one first,
 * de-duplicated. The picker shows these above the full alphabetical list.
 */
fun suggestedCountries(language: String, current: String?): List<String> =
    (listOfNotNull(normalizeCountry(current)) + SUGGESTED_COUNTRIES[language].orEmpty()).distinct()

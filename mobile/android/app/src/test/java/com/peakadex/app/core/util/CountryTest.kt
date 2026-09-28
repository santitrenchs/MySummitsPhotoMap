package com.peakadex.app.core.util

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import com.peakadex.app.core.model.GoogleLoginRequest
import com.peakadex.app.core.model.RegisterRequest
import com.peakadex.app.core.model.UpdateCountryRequest
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.assertTrue
import org.junit.Test

/** Pure-JVM checks of the country helpers (no MapLibre / Android runtime needed). */
class CountryTest {

    @Test fun normalizeAcceptsValidCodesOnly() {
        assertEquals("ES", normalizeCountry("es"))
        assertEquals("XK", normalizeCountry("XK"))
        assertNull(normalizeCountry(""))
        assertNull(normalizeCountry("419"))   // es-419, "Latin America", is not a country
        assertNull(normalizeCountry("ZZ"))
        assertNull(normalizeCountry(null))
    }

    @Test fun boundsTableIsWestSouthEastNorth() {
        // Same values as web lib/country.ts.
        assertArrayEquals(doubleArrayOf(-9.39, 35.95, 4.33, 43.79), COUNTRY_BOUNDS["ES"], 0.0)
        COUNTRY_BOUNDS.forEach { (code, b) ->
            assert(b[0] < b[2]) { "$code: west must be < east" }
            assert(b[1] < b[3]) { "$code: south must be < north" }
        }
    }

    @Test fun suggestedPutsCurrentFirstWithoutDuplicates() {
        assertEquals(listOf("FR", "ES", "AD"), suggestedCountries("ca", "fr"))
        assertEquals(listOf("ES", "AD", "FR"), suggestedCountries("ca", null))
    }

    /** Same flags as ApiClient: encodeDefaults stays false, so the field must have no default. */
    private val json = Json { ignoreUnknownKeys = true; isLenient = true; coerceInputValues = true }

    @Test fun nullCountryIsSentExplicitly() {
        val reg = json.encodeToString(RegisterRequest(name = "a", email = "b", password = "c", country = null))
        assertTrue(reg, reg.contains("\"country\":null"))
        assertTrue(json.encodeToString(UpdateCountryRequest(null)).contains("\"country\":null"))
        assertTrue(json.encodeToString(GoogleLoginRequest("t", "ES")).contains("\"country\":\"ES\""))
    }
}

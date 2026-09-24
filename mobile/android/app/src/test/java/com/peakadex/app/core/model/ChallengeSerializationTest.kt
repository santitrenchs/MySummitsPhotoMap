package com.peakadex.app.core.model

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Los modelos de Retos contra respuestas REALES de los endpoints `v1/challenges`.
 * (Ojo al escribir aquí: Kotlin anida comentarios de bloque, así que una barra
 * seguida de asterisco dentro de este KDoc lo deja sin cerrar.)
 *
 * Por qué existe este test: en este proyecto la deserialización de Kotlinx falla
 * **en silencio**. Un campo sin valor por defecto, un wrapper que falta o un tipo
 * equivocado no rompen la compilación ni dejan un error visible — la pantalla
 * simplemente aparece vacía, y el historial del repo tiene varios casos
 * (`getPersons` devolviendo una lista en vez de `{ persons }`, `Peak` sin
 * defaults en lat/lon). Compilar no demuestra nada; esto sí.
 *
 * Los JSON son capturas literales de la API con una sesión de staging, recortadas
 * a una o dos filas. Si la forma de la respuesta cambia, esto se pone rojo.
 */
class ChallengeSerializationTest {

    /** Misma configuración que `ApiClient`, o el test no probaría lo que corre en producción. */
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        coerceInputValues = true
    }

    @Test
    fun `lista de retos`() {
        val res = json.decodeFromString<ChallengesResponse>(LIST_JSON)

        val mine = res.mine.single()
        assertEquals("buysestaging", mine.id)
        assertEquals("Los 3000 de Buyse", mine.name)
        assertEquals(239, mine.totalPeaks)
        assertEquals(5, mine.completedPeaks)
        assertTrue(mine.isActive)

        // `available` incluye los ya unidos, marcados — no se filtran.
        assertTrue(res.available.single().isJoined)
    }

    @Test
    fun `detalle con una cima hecha y una pendiente`() {
        val c = json.decodeFromString<ChallengeDetailResponse>(DETAIL_JSON).challenge

        assertEquals(239, c.totalPeaks)
        assertEquals(5, c.completedPeaks)
        assertEquals(3404, c.maxAltitudeM)
        assertTrue(c.isJoined)

        val done = c.peaks.first { it.done }
        assertEquals("Tuca de Posets", done.name)
        assertEquals(3369, done.altitudeM)
        // El dato que más fácil se modela mal: es un String ISO, no un Date.
        assertEquals("2026-06-05T00:00:00.000Z", done.lastAscentDate)
        assertTrue(done.photoUrl!!.startsWith("https://"))

        val pending = c.peaks.first { !it.done }
        assertEquals("Aneto", pending.name)
        assertNull(pending.lastAscentDate)
        assertNull(pending.photoUrl)
        // isMythic y rarityId son independientes: hay cimas míticas sin rareza "mythic".
        assertTrue(pending.isMythic)
        assertEquals("edelweiss", pending.rarityId)

        // mountainRange y comarca son null en las cimas de los retos reales.
        assertNull(done.mountainRange)
        assertNull(done.comarca)
    }

    @Test
    fun `cimas del mapa`() {
        val c = json.decodeFromString<ChallengeMapResponse>(MAP_JSON).challenge

        assertEquals("Los 3000 de Buyse", c.name)
        val p = c.peaks.single()
        assertEquals(42.7050096, p.latitude, 1e-7)
        assertEquals(0.5203008, p.longitude, 1e-7)
        assertEquals(3037, p.altitudeM)
        assertFalse(p.isMythic)
    }

    /**
     * El servidor manda un objeto `rarity` anidado que el modelo no declara. Debe
     * ignorarse sin romper: es la razón de `ignoreUnknownKeys`, y lo que permite
     * que la API crezca sin forzar una release de la app.
     */
    @Test
    fun `campos desconocidos no rompen`() {
        val c = json.decodeFromString<ChallengeMapResponse>(MAP_JSON).challenge
        assertEquals(1, c.peaks.size)
    }

    /** Una respuesta mínima: todo lo omitible tiene default y no debe lanzar. */
    @Test
    fun `campos ausentes caen a sus valores por defecto`() {
        val minimal = """{"mine":[{"id":"x","slug":"s","name":"N"}],"available":[]}"""
        val mine = json.decodeFromString<ChallengesResponse>(minimal).mine.single()

        assertEquals(0, mine.totalPeaks)
        assertEquals(0, mine.completedPeaks)
        assertNull(mine.description)
        assertNull(mine.coverUrl)
        assertTrue(mine.isActive)
    }

    private companion object {
        const val LIST_JSON = """
{"mine":[{"id":"buysestaging","slug":"els-3000-de-buyse","name":"Los 3000 de Buyse","description":"Las cumbres de más de 3.000 m del Pirineo de la lista de Buyse.","coverUrl":"https://media.peakadex.com/challenges/tresmils3000.jpg","totalPeaks":239,"completedPeaks":5,"isActive":true}],"available":[{"id":"buysestaging","slug":"els-3000-de-buyse","name":"Los 3000 de Buyse","description":"Las cumbres de más de 3.000 m del Pirineo de la lista de Buyse.","coverUrl":"https://media.peakadex.com/challenges/tresmils3000.jpg","totalPeaks":239,"isJoined":true}]}
"""

        const val DETAIL_JSON = """
{"challenge":{"id":"buysestaging","slug":"els-3000-de-buyse","name":"Los 3000 de Buyse","description":"Las cumbres de más de 3.000 m del Pirineo de la lista de Buyse.","coverUrl":"https://media.peakadex.com/challenges/tresmils3000.jpg","isActive":true,"isJoined":true,"totalPeaks":239,"completedPeaks":5,"maxAltitudeM":3404,"peaks":[{"id":"1558737b-924e-41b1-86fe-5cead910bacd","name":"Tuca de Posets","altitudeM":3369,"mountainRange":null,"comarca":null,"country":"ES","rarityId":"edelweiss","isMythic":false,"done":true,"lastAscentDate":"2026-06-05T00:00:00.000Z","photoUrl":"https://mediastaging.peakadex.com/tenant/d55671f7-deb9-4941-b945-e06e471a84da/photos/a400e521-517e-440e-8392-4632b96aa328.jpg"},{"id":"688dccee-e8c2-4b6c-873a-fbbfccae86bd","name":"Aneto","altitudeM":3404,"mountainRange":null,"comarca":null,"country":"ES","rarityId":"edelweiss","isMythic":true,"done":false,"lastAscentDate":null,"photoUrl":null}]}}
"""

        const val MAP_JSON = """
{"challenge":{"id":"buysestaging","name":"Los 3000 de Buyse","peaks":[{"id":"b854d2a6-6d42-4c11-8fb0-6774b134e748","name":"Aguja Inferior de Lézat","latitude":42.7050096,"longitude":0.5203008,"altitudeM":3037,"mountainRange":null,"country":"FR","rarityId":"edelweiss","isMythic":false,"rarity":{"id":"edelweiss","name":"Edelweiss","emoji":"🌸","order":4}}]}}
"""
    }
}

package com.peakadex.app.feature.atlas

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.peakadex.app.AppContainer
import com.peakadex.app.core.model.GeocodedPlace
import com.peakadex.app.core.model.MapAscent
import com.peakadex.app.core.model.ChallengeSummary
import com.peakadex.app.core.model.Peak
import com.peakadex.app.core.model.Rarity
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

// ── State ─────────────────────────────────────────────────────────────────────

enum class AtlasFilter { ALL, CLIMBED, NOT_YET }

enum class SortMode { DISTANCE, RELEVANCE, ALTITUDE }

data class SelectedPeakUi(
    val peak: Peak,
    val ascent: MapAscent?,          // null → unclimbed
)

data class AtlasUiState(
    val isLoadingAscents: Boolean = true,
    val climbedByPeakId: Map<String, MapAscent> = emptyMap(),
    // Accumulative cache of all unclimbed peaks seen so far (keyed by peak id).
    // Merges on every viewport fetch — never replaces — so peaks remain available
    // after the camera moves away, exactly like peaksCacheRef in the web MapView.
    val peaksCache: Map<String, Peak> = emptyMap(),
    val listPeaks: List<Peak> = emptyList(),         // fixed-radius peaks for list view
    val isLoadingList: Boolean = false,
    val filter: AtlasFilter = AtlasFilter.ALL,
    val selectedRarityIds: Set<String> = emptySet(), // empty = all rarities
    val mythicFilter: Boolean = false,
    val sortMode: SortMode = SortMode.DISTANCE,
    val rarities: List<Rarity> = emptyList(),
    val selected: SelectedPeakUi? = null,
    val searchQuery: String = "",
    val searchResults: List<Peak> = emptyList(),
    val placeResults: List<GeocodedPlace> = emptyList(),
    val refugioResults: List<GeocodedPlace> = emptyList(),
    val isSearchActive: Boolean = false,
    val isSearching: Boolean = false,    // a search request is in flight (or debouncing)
    val showList: Boolean = false,
    val error: String? = null,           // getMapAscents (climbed peaks) failed
    val viewportError: Boolean = false,  // last viewport peaks fetch failed
    // Current camera bounds — lets the UI (filter counts) scope the accumulative
    // peaksCache to what the user is actually looking at.
    val bounds: ViewportBounds? = null,

    // ── Modo reto ────────────────────────────────────────────────────────────
    // Cuando hay un reto activo el Atlas deja de ser el catálogo y pasa a ser
    // SOLO las cimas de ese reto. No es un filtro más: es el ámbito, y por eso
    // los filtros de rareza y estado siguen funcionando dentro de él.
    val challengeId: String? = null,
    val challengeName: String? = null,
    val challengePeaks: List<Peak> = emptyList(),
    val isLoadingChallenge: Boolean = false,
    /** Retos a los que el usuario pertenece, para la sección del panel de filtros. */
    val myChallenges: List<ChallengeSummary> = emptyList(),
) {
    val inChallengeMode: Boolean get() = challengeId != null
    private val challengePeakIds: Set<String> get() = challengePeaks.mapTo(HashSet()) { it.id }

    /**
     * Cimas del reto ya subidas. El endpoint del mapa no manda progreso porque no
     * hace falta: es el cruce de sus cimas con las ascensiones que ya tenemos.
     */
    val challengeDone: Int get() = challengePeaks.count { it.id in climbedByPeakId }

    /**
     * Lo que se pinta como "no subido".
     *
     * En modo reto son SUS cimas, no la caché del viewport: si saliera de la
     * caché, un paneo repoblaría el mapa desde el catálogo entero y "filtrado por
     * el reto" duraría un gesto.
     */
    val mapUnclimbed: List<Peak> get() =
        if (inChallengeMode) challengePeaks else peaksCache.values.toList()

    /**
     * Marcadores de foto a pintar. En modo reto se ocultan las cimas subidas que
     * no pertenecen al reto: si no, el mapa filtra los puntos pero sigue
     * enseñando cumbres ajenas y la pantalla deja de significar nada.
     */
    val mapClimbed: Map<String, MapAscent> get() =
        if (inChallengeMode) climbedByPeakId.filterKeys { it in challengePeakIds }
        else climbedByPeakId
}

private const val TAG = "AtlasViewModel"

// Separate debounces: viewport queries benefit from a longer delay to avoid
// firing mid-animation (camera idle fires 2-3× during a single fly-to).
private const val VIEWPORT_DEBOUNCE_MS = 500L
private const val SEARCH_DEBOUNCE_MS   = 300L
// Maximum entries in the peaks cache. Oldest keys are evicted when exceeded,
// mirroring the CACHE_MAX eviction in the web MapView's peaksCacheRef.
private const val PEAKS_CACHE_MAX = 2000

data class ViewportBounds(
    val north: Double, val south: Double,
    val east: Double,  val west: Double,
    val zoom: Double,
) {
    fun contains(lat: Double, lon: Double): Boolean =
        lat in south..north && lon in west..east
}

// ── ViewModel ─────────────────────────────────────────────────────────────────

class AtlasViewModel : ViewModel() {

    private val api = AppContainer.apiService

    private val _uiState = MutableStateFlow(AtlasUiState())
    val uiState: StateFlow<AtlasUiState> = _uiState.asStateFlow()

    private var viewportJob: Job? = null
    private var searchJob: Job? = null
    private var loadListJob: Job? = null

    // Last known bounds — used to re-fetch when the filter changes while stationary.
    private var lastBounds: ViewportBounds? = null

    init {
        loadConfig()
        loadClimbedAscents()
    }

    private fun loadConfig() {
        viewModelScope.launch {
            runCatching { api.getConfig() }
                .onSuccess { config -> _uiState.update { it.copy(rarities = config.rarities) } }
                .onFailure { e -> Log.e(TAG, "loadConfig failed: ${e.message}") }
        }
    }

    fun loadClimbedAscents() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingAscents = true, error = null) }
            runCatching { api.getMapAscents() }.fold(
                onSuccess = { response ->
                    _uiState.update {
                        it.copy(
                            isLoadingAscents = false,
                            climbedByPeakId = response.ascents.associateBy { a -> a.peakId },
                        )
                    }
                },
                onFailure = { e ->
                    _uiState.update { it.copy(isLoadingAscents = false, error = e.message) }
                },
            )
        }
    }

    fun onMapIdle(north: Double, south: Double, east: Double, west: Double, zoom: Double) {
        lastBounds = ViewportBounds(north, south, east, west, zoom)
        _uiState.update { it.copy(bounds = lastBounds) }
        // En modo reto el mapa muestra un conjunto fijo: pedir cimas por viewport
        // lo repoblaría desde el catálogo. Las bounds sí se guardan, para poder
        // repoblar al salir sin esperar a que el usuario mueva la cámara.
        if (_uiState.value.inChallengeMode) return
        if (_uiState.value.filter == AtlasFilter.CLIMBED) return
        viewportJob?.cancel()
        viewportJob = viewModelScope.launch {
            delay(VIEWPORT_DEBOUNCE_MS)
            val centerLat = (north + south) / 2.0
            val centerLon = (east + west) / 2.0
            try {
                // roundToInt, not toInt: truncating 5.9 → 5 crosses the server's
                // `zoom < 6` boundary and cuts the take limit from 150 to 50 peaks.
                val response = api.getViewportPeaks(north, south, east, west, zoom.roundToInt())
                val climbed = _uiState.value.climbedByPeakId
                val unclimbed = response.peaks.filter { it.id !in climbed }
                val culled = applyViewportScore(unclimbed, zoom, centerLat, centerLon)
                // Merge into the accumulative cache — never replace. This mirrors the web
                // MapView's peaksCacheRef so peaks remain selectable after the camera moves.
                _uiState.update { state ->
                    val merged = LinkedHashMap<String, Peak>(state.peaksCache)
                    for (p in culled) merged[p.id] = p
                    // Evict oldest entries if the cache is too large
                    val evicted = if (merged.size > PEAKS_CACHE_MAX) {
                        val drop = merged.size - PEAKS_CACHE_MAX
                        val iter = merged.iterator()
                        repeat(drop) { if (iter.hasNext()) { iter.next(); iter.remove() } }
                        merged
                    } else merged
                    state.copy(peaksCache = evicted, viewportError = false)
                }
            } catch (e: CancellationException) {
                throw e   // never swallow — a newer viewport fetch superseded this one
            } catch (e: Exception) {
                // Surface the failure: without this the map silently shows only
                // climbed peaks and the user has no idea a fetch failed.
                Log.e(TAG, "viewport peaks fetch failed: ${e.message}")
                _uiState.update { it.copy(viewportError = true) }
            }
        }
    }

    // ── Modo reto ────────────────────────────────────────────────────────────

    /** Carga los retos del usuario para la sección del panel de filtros. */
    fun loadMyChallenges() {
        if (_uiState.value.myChallenges.isNotEmpty()) return
        viewModelScope.launch {
            try {
                val res = api.getChallenges()
                _uiState.update { it.copy(myChallenges = res.mine) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // Sin retos la sección simplemente no se pinta y el resto de
                // filtros sigue funcionando: no merece romper el panel.
                Log.e(TAG, "my challenges fetch failed: ${e.message}")
            }
        }
    }

    /**
     * Acota el Atlas a un reto. La cámara la encuadra la pantalla, que es quien
     * tiene el mapa; aquí solo se cargan las cimas.
     */
    fun enterChallenge(challengeId: String, challengeName: String?) {
        if (_uiState.value.challengeId == challengeId) return
        viewportJob?.cancel()   // un fetch en vuelo repoblaría el mapa tras entrar
        _uiState.update {
            it.copy(
                challengeId = challengeId,
                challengeName = challengeName,
                challengePeaks = emptyList(),
                isLoadingChallenge = true,
                selected = null,
            )
        }
        viewModelScope.launch {
            try {
                val c = api.getChallengeMap(challengeId).challenge
                val peaks = c.peaks.map { p ->
                    Peak(
                        id = p.id, name = p.name,
                        latitude = p.latitude, longitude = p.longitude,
                        altitudeM = p.altitudeM, mountainRange = p.mountainRange,
                        country = p.country, rarityId = p.rarityId, isMythic = p.isMythic,
                    )
                }
                _uiState.update {
                    it.copy(
                        challengeName = c.name,
                        challengePeaks = peaks,
                        isLoadingChallenge = false,
                    )
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "challenge map fetch failed: ${e.message}")
                // Salir del modo en vez de dejar un Atlas vacío con el chip puesto,
                // que parecería un reto sin cimas.
                _uiState.update {
                    it.copy(challengeId = null, challengeName = null, isLoadingChallenge = false)
                }
                lastBounds?.let { b -> onMapIdle(b.north, b.south, b.east, b.west, b.zoom) }
            }
        }
    }

    /**
     * Vuelve al catálogo. Repuebla desde las últimas bounds conocidas en vez de
     * esperar a que el usuario mueva la cámara, que dejaría el mapa vacío.
     */
    fun exitChallenge() {
        if (!_uiState.value.inChallengeMode) return
        _uiState.update {
            it.copy(challengeId = null, challengeName = null, challengePeaks = emptyList(), selected = null)
        }
        lastBounds?.let { b -> onMapIdle(b.north, b.south, b.east, b.west, b.zoom) }
    }

    // Retries whatever failed: the climbed-ascents load and/or the last viewport fetch.
    fun retry() {
        if (_uiState.value.error != null) loadClimbedAscents()
        _uiState.update { it.copy(viewportError = false) }
        lastBounds?.let { b -> onMapIdle(b.north, b.south, b.east, b.west, b.zoom) }
    }

    fun onFilterChanged(filter: AtlasFilter) {
        _uiState.update { it.copy(filter = filter, selected = null) }
        // Switching away from CLIMBED: no viewport fetches ran while it was active,
        // so the cache has nothing for wherever the camera moved in the meantime.
        // Always re-fetch the last bounds — a non-empty cache from an OLD area must
        // not suppress this, or the current area shows zero unclimbed peaks until
        // the user moves the camera again. The merge-only cache makes this cheap.
        if (filter != AtlasFilter.CLIMBED) {
            lastBounds?.let { b -> onMapIdle(b.north, b.south, b.east, b.west, b.zoom) }
        }
    }

    // Single atomic update: toggling a rarity also deactivates the mythic filter
    // (mutually exclusive). Doing this in one _uiState.update avoids the previous
    // two-step dance in the UI (onMythicFilterChanged(false) + onRarityFilterChanged)
    // whose correctness depended on call order.
    fun toggleRarity(id: String) {
        _uiState.update {
            val next = if (id in it.selectedRarityIds) it.selectedRarityIds - id
                       else it.selectedRarityIds + id
            it.copy(selectedRarityIds = next, mythicFilter = false)
        }
    }

    fun onMythicFilterChanged(enabled: Boolean) {
        _uiState.update { it.copy(mythicFilter = enabled, selectedRarityIds = emptySet()) }
    }

    fun onSortModeChanged(mode: SortMode) {
        _uiState.update { it.copy(sortMode = mode) }
    }

    // Called from list, search results, or any context where the full Peak object is available.
    // Never does a lookup — cannot fail silently. Mirrors web's flyToPeak(peak).
    fun onPeakSelected(peak: Peak) {
        val ascent = _uiState.value.climbedByPeakId[peak.id]
        // Also add to cache so the map can render it even if it was outside the viewport.
        _uiState.update { state ->
            val merged = LinkedHashMap<String, Peak>(state.peaksCache)
            merged[peak.id] = peak
            state.copy(peaksCache = merged, selected = SelectedPeakUi(peak, ascent))
        }
    }

    // Called from map tap events where only the peakId from the GeoJSON feature is available.
    fun onPeakSelectedById(peakId: String) {
        val state = _uiState.value
        val ascent = state.climbedByPeakId[peakId]
        val peak = ascent?.peak
            ?: state.peaksCache[peakId]
            ?: state.searchResults.find { it.id == peakId }
            ?: state.listPeaks.find { it.id == peakId }
            ?: return
        _uiState.update { it.copy(selected = SelectedPeakUi(peak, ascent)) }
    }

    fun onSelectionDismissed() {
        _uiState.update { it.copy(selected = null) }
    }

    fun onSearchQueryChanged(query: String) {
        _uiState.update { it.copy(searchQuery = query, isSearchActive = query.isNotEmpty()) }
        // Server search requires >= 2 chars (a 1-char q falls through the server's
        // search branch into an unbounded query). Don't fire for short queries.
        if (query.trim().length < 2) {
            searchJob?.cancel()
            _uiState.update {
                it.copy(
                    searchResults = emptyList(), placeResults = emptyList(),
                    refugioResults = emptyList(), isSearching = false,
                )
            }
            return
        }
        searchJob?.cancel()
        _uiState.update { it.copy(isSearching = true) }
        searchJob = viewModelScope.launch {
            delay(SEARCH_DEBOUNCE_MS)
            try {
                val response = api.searchPeaks(query)
                _uiState.update {
                    it.copy(
                        searchResults  = response.peaks.take(20),
                        placeResults   = response.places,
                        refugioResults = response.refugios,
                        isSearching    = false,
                    )
                }
            } catch (e: CancellationException) {
                throw e   // superseded by a newer keystroke — that one owns isSearching
            } catch (e: Exception) {
                // Clear stale results from the PREVIOUS query — leaving them on
                // screen misleads the user into tapping outdated matches.
                Log.e(TAG, "peak search failed: ${e.message}")
                _uiState.update {
                    it.copy(
                        searchResults = emptyList(), placeResults = emptyList(),
                        refugioResults = emptyList(), isSearching = false,
                    )
                }
            }
        }
    }

    fun onSearchResultSelected(peak: Peak) {
        searchJob?.cancel()   // an in-flight search must not repopulate results after selection
        val ascent = _uiState.value.climbedByPeakId[peak.id]
        _uiState.update {
            it.copy(
                searchQuery   = "",
                isSearchActive = false,
                isSearching    = false,
                searchResults  = emptyList(),
                placeResults   = emptyList(),
                refugioResults = emptyList(),
                selected      = SelectedPeakUi(peak, ascent),
            )
        }
    }

    fun onPlaceSelected() {
        // Place selection only moves the camera — no peak detail sheet.
        searchJob?.cancel()
        _uiState.update {
            it.copy(
                searchQuery   = "",
                isSearchActive = false,
                isSearching    = false,
                searchResults  = emptyList(),
                placeResults   = emptyList(),
                refugioResults = emptyList(),
            )
        }
    }

    fun onSearchDismissed() {
        searchJob?.cancel()
        _uiState.update {
            it.copy(
                searchQuery   = "",
                isSearchActive = false,
                isSearching    = false,
                searchResults  = emptyList(),
                placeResults   = emptyList(),
                refugioResults = emptyList(),
            )
        }
    }

    fun onToggleList(centerLat: Double? = null, centerLon: Double? = null) {
        val wasShowing = _uiState.value.showList
        _uiState.update { it.copy(showList = !wasShowing, selected = null) }
        if (!wasShowing) {
            // Fall back to lastBounds centre if the camera hasn't settled yet (cameraCenter == null)
            val lat = centerLat ?: lastBounds?.let { (it.north + it.south) / 2 }
            val lon = centerLon ?: lastBounds?.let { (it.east + it.west) / 2 }
            if (lat != null && lon != null) {
                loadListJob?.cancel()
                loadListJob = viewModelScope.launch { loadListPeaks(lat, lon) }
            }
        } else {
            loadListJob?.cancel()
            _uiState.update { it.copy(listPeaks = emptyList()) }
        }
    }

    private suspend fun loadListPeaks(centerLat: Double, centerLon: Double) {
        _uiState.update { it.copy(isLoadingList = true) }
        // Fixed ~50 km radius bbox (0.45° lat ≈ 50 km; 0.60° lon ≈ 50 km at 41°N)
        val north = centerLat + 0.45
        val south = centerLat - 0.45
        val east  = centerLon + 0.60
        val west  = centerLon - 0.60
        try {
            val response = api.getViewportPeaks(north, south, east, west, zoom = 12)
            // Merge into the accumulative cache so tapping a peak from the list
            // works even if its area is outside the current map viewport.
            _uiState.update { state ->
                val merged = LinkedHashMap<String, Peak>(state.peaksCache)
                for (p in response.peaks) merged[p.id] = p
                state.copy(listPeaks = response.peaks, peaksCache = merged, isLoadingList = false)
            }
        } catch (e: CancellationException) {
            throw e   // list was closed / reopened — a newer load owns the state
        } catch (e: Exception) {
            Log.e(TAG, "list peaks fetch failed: ${e.message}")
            _uiState.update { it.copy(isLoadingList = false) }
        }
    }

    fun clearFilters() {
        val wasClimbed = _uiState.value.filter == AtlasFilter.CLIMBED
        _uiState.update {
            it.copy(
                filter            = AtlasFilter.ALL,
                selectedRarityIds = emptySet(),
                mythicFilter      = false,
                sortMode          = SortMode.DISTANCE,
            )
        }
        // Same rationale as onFilterChanged: leaving CLIMBED means no viewport
        // fetches ran while it was active — refresh the current area.
        if (wasClimbed) {
            lastBounds?.let { b -> onMapIdle(b.north, b.south, b.east, b.west, b.zoom) }
        }
    }

    // ── Viewport scoring ──────────────────────────────────────────────────────
    //
    // At low zoom levels the viewport covers thousands of km² and the server
    // returns up to 300 peaks — rendering all of them clutters the map.
    // This function selects the most relevant subset using a composite score:
    //   altitude   0.5  — higher peaks are more significant landmarks
    //   rarity     0.3  — rarer peaks deserve more visibility
    //   proximity  0.2  — peaks near the viewport center are more relevant
    //
    // The percentage of peaks kept follows a discovery-friendly ramp:
    //   zoom ≤ 5  → 10 %
    //   zoom = 8  → ~49 %
    //   zoom = 10 → ~74 %
    //   zoom ≥ 12 → 100 %  (no culling needed at valley level)

    private fun applyViewportScore(
        peaks: List<Peak>,
        zoom: Double,
        centerLat: Double,
        centerLon: Double,
    ): List<Peak> {
        if (zoom >= 12.0) return peaks
        val rarityWeights = _uiState.value.rarities.associate { it.id to it.scoreWeight }
        val maxAlt  = peaks.maxOfOrNull { it.altitudeM } ?: return peaks
        val maxDist = peaks.maxOfOrNull { haversineKm(centerLat, centerLon, it.latitude, it.longitude) }
            ?.takeIf { it > 0.0 } ?: 1.0

        val scored = peaks.map { peak ->
            val distKm   = haversineKm(centerLat, centerLon, peak.latitude, peak.longitude)
            val normDist = 1.0 - (distKm / maxDist).coerceIn(0.0, 1.0)   // closer = higher
            // `importance` (altitude + isolation, precomputed server-side) replaces the
            // altitude+rarity pair, which were the SAME variable twice: rarityId is a
            // pure function of altitude, so the two terms only ever re-sorted by height
            // and handed a whole massif to one summit's sub-peaks.
            val merit = peak.importance ?: run {
                val normAlt = if (maxAlt > 0) peak.altitudeM.toDouble() / maxAlt else 0.0
                val rw      = peak.rarityId?.let { rarityWeights[it] } ?: 0.1
                normAlt * 0.625 + rw * 0.375   // same 0.5/0.3 ratio, rescaled to 0..1
            }
            peak to (merit * 0.8 + normDist * 0.2)
        }.sortedByDescending { it.second }

        val pct = when {
            zoom <= 5.0  -> 0.10
            zoom >= 12.0 -> 1.0
            else         -> 0.10 + (zoom - 5.0) / 7.0 * 0.90
        }
        val take = maxOf(1, (peaks.size * pct).toInt())
        return scored.take(take).map { it.first }
    }

    private fun haversineKm(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val R    = 6371.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a    = sin(dLat / 2).pow(2) +
            cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLon / 2).pow(2)
        return R * 2 * atan2(sqrt(a), sqrt(1 - a))
    }
}

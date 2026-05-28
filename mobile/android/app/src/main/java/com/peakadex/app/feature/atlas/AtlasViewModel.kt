package com.peakadex.app.feature.atlas

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.peakadex.app.AppContainer
import com.peakadex.app.core.model.GeocodedPlace
import com.peakadex.app.core.model.MapAscent
import com.peakadex.app.core.model.Peak
import com.peakadex.app.core.model.Rarity
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
    val viewportPeaks: List<Peak> = emptyList(),    // unclimbed peaks in viewport
    val listPeaks: List<Peak> = emptyList(),         // fixed-radius peaks for list view
    val isLoadingList: Boolean = false,
    val filter: AtlasFilter = AtlasFilter.ALL,
    val selectedRarityIds: Set<String> = emptySet(), // empty = all rarities
    val sortMode: SortMode = SortMode.DISTANCE,
    val rarities: List<Rarity> = emptyList(),
    val selected: SelectedPeakUi? = null,
    val searchQuery: String = "",
    val searchResults: List<Peak> = emptyList(),
    val placeResults: List<GeocodedPlace> = emptyList(),
    val isSearchActive: Boolean = false,
    val showList: Boolean = false,
    val error: String? = null,
)

private const val TAG = "AtlasViewModel"

// Separate debounces: viewport queries benefit from a longer delay to avoid
// firing mid-animation (camera idle fires 2-3× during a single fly-to).
private const val VIEWPORT_DEBOUNCE_MS = 500L
private const val SEARCH_DEBOUNCE_MS   = 300L

private data class ViewportBounds(
    val north: Double, val south: Double,
    val east: Double,  val west: Double,
    val zoom: Double,
)

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
        if (_uiState.value.filter == AtlasFilter.CLIMBED) return
        viewportJob?.cancel()
        viewportJob = viewModelScope.launch {
            delay(VIEWPORT_DEBOUNCE_MS)
            val centerLat = (north + south) / 2.0
            val centerLon = (east + west) / 2.0
            runCatching { api.getViewportPeaks(north, south, east, west, zoom.toInt()) }.onSuccess { response ->
                val climbed = _uiState.value.climbedByPeakId
                val unclimbed = response.peaks.filter { it.id !in climbed }
                val culled = applyViewportScore(unclimbed, zoom, centerLat, centerLon)
                _uiState.update { it.copy(viewportPeaks = culled) }
            }
        }
    }

    fun onFilterChanged(filter: AtlasFilter) {
        _uiState.update { it.copy(filter = filter, selected = null) }
        // Switching away from CLIMBED leaves viewportPeaks stale (they were skipped while
        // CLIMBED was active). Re-fetch immediately so unclimbed peaks appear at once.
        if (filter != AtlasFilter.CLIMBED && _uiState.value.viewportPeaks.isEmpty()) {
            lastBounds?.let { b -> onMapIdle(b.north, b.south, b.east, b.west, b.zoom) }
        }
    }

    fun onRarityFilterChanged(ids: Set<String>) {
        _uiState.update { it.copy(selectedRarityIds = ids) }
    }

    fun onSortModeChanged(mode: SortMode) {
        _uiState.update { it.copy(sortMode = mode) }
    }

    fun onPeakSelected(peakId: String) {
        val state = _uiState.value
        val ascent = state.climbedByPeakId[peakId]
        val peak = ascent?.peak
            ?: state.viewportPeaks.find { it.id == peakId }
            ?: state.searchResults.find { it.id == peakId }
            ?: return
        _uiState.update { it.copy(selected = SelectedPeakUi(peak, ascent)) }
    }

    fun onSelectionDismissed() {
        _uiState.update { it.copy(selected = null) }
    }

    fun onSearchQueryChanged(query: String) {
        _uiState.update { it.copy(searchQuery = query, isSearchActive = query.isNotEmpty()) }
        if (query.isBlank()) {
            _uiState.update { it.copy(searchResults = emptyList(), placeResults = emptyList()) }
            return
        }
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(SEARCH_DEBOUNCE_MS)
            runCatching { api.searchPeaks(query) }.onSuccess { response ->
                _uiState.update {
                    it.copy(
                        searchResults = response.peaks.take(20),
                        placeResults  = response.places,
                    )
                }
            }
        }
    }

    fun onSearchResultSelected(peak: Peak) {
        val ascent = _uiState.value.climbedByPeakId[peak.id]
        _uiState.update {
            it.copy(
                searchQuery   = "",
                isSearchActive = false,
                searchResults = emptyList(),
                placeResults  = emptyList(),
                selected      = SelectedPeakUi(peak, ascent),
            )
        }
    }

    fun onPlaceSelected() {
        // Place selection only moves the camera — no peak detail sheet.
        _uiState.update {
            it.copy(
                searchQuery   = "",
                isSearchActive = false,
                searchResults = emptyList(),
                placeResults  = emptyList(),
            )
        }
    }

    fun onSearchDismissed() {
        _uiState.update {
            it.copy(
                searchQuery   = "",
                isSearchActive = false,
                searchResults = emptyList(),
                placeResults  = emptyList(),
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
        runCatching { api.getViewportPeaks(north, south, east, west, zoom = 12) }
            .onSuccess { response ->
                _uiState.update { it.copy(listPeaks = response.peaks, isLoadingList = false) }
            }
            .onFailure {
                _uiState.update { it.copy(isLoadingList = false) }
            }
    }

    fun clearFilters() {
        _uiState.update {
            it.copy(
                filter            = AtlasFilter.ALL,
                selectedRarityIds = emptySet(),
                sortMode          = SortMode.DISTANCE,
            )
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
    // The percentage of peaks kept follows a smooth linear ramp (no abrupt jumps):
    //   zoom ≤ 5  →  5 %
    //   zoom = 9  → ~52 %
    //   zoom ≥ 13 → 100 %  (no culling needed at street level)

    private fun applyViewportScore(
        peaks: List<Peak>,
        zoom: Double,
        centerLat: Double,
        centerLon: Double,
    ): List<Peak> {
        if (zoom >= 13.0) return peaks
        val rarityWeights = _uiState.value.rarities.associate { it.id to it.scoreWeight }
        val maxAlt  = peaks.maxOfOrNull { it.altitudeM } ?: return peaks
        val maxDist = peaks.maxOfOrNull { haversineKm(centerLat, centerLon, it.latitude, it.longitude) }
            ?.takeIf { it > 0.0 } ?: 1.0

        val scored = peaks.map { peak ->
            val normAlt  = if (maxAlt > 0) peak.altitudeM.toDouble() / maxAlt else 0.0
            val rw       = peak.rarityId?.let { rarityWeights[it] } ?: 0.1
            val distKm   = haversineKm(centerLat, centerLon, peak.latitude, peak.longitude)
            val normDist = 1.0 - (distKm / maxDist).coerceIn(0.0, 1.0)   // closer = higher
            peak to (normAlt * 0.5 + rw * 0.3 + normDist * 0.2)
        }.sortedByDescending { it.second }

        // Linear ramp: 5 % at zoom 5 → 100 % at zoom 13.
        val pct = when {
            zoom <= 5.0  -> 0.05
            zoom >= 13.0 -> 1.0
            else         -> 0.05 + (zoom - 5.0) / 8.0 * 0.95
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

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
    val viewportPeaks: List<Peak> = emptyList(),    // peaks in viewport
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

// ── ViewModel ─────────────────────────────────────────────────────────────────

class AtlasViewModel : ViewModel() {

    private val api = AppContainer.apiService

    private val _uiState = MutableStateFlow(AtlasUiState())
    val uiState: StateFlow<AtlasUiState> = _uiState.asStateFlow()

    private var viewportJob: Job? = null
    private var searchJob: Job? = null

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
        if (_uiState.value.filter == AtlasFilter.CLIMBED) return  // no need to fetch
        viewportJob?.cancel()
        viewportJob = viewModelScope.launch {
            delay(300)
            runCatching { api.getViewportPeaks(north, south, east, west) }.onSuccess { response ->
                val climbed = _uiState.value.climbedByPeakId
                val unclimbed = response.peaks.filter { it.id !in climbed }
                val culled = applyViewportScore(unclimbed, zoom)
                _uiState.update { it.copy(viewportPeaks = culled) }
            }
        }
    }

    fun onFilterChanged(filter: AtlasFilter) {
        _uiState.update { it.copy(filter = filter, selected = null) }
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
            delay(300)
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
        // State cleanup only; camera animation is done in the UI layer.
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

    fun onToggleList() {
        _uiState.update { it.copy(showList = !it.showList, selected = null) }
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

    // ── Viewport scoring (mirrors web MapView.tsx computeViewportScores) ──────

    private fun applyViewportScore(peaks: List<Peak>, zoom: Double): List<Peak> {
        if (zoom >= 10.0) return peaks
        val rarityWeights = _uiState.value.rarities.associate { it.id to it.scoreWeight }
        val maxAlt = peaks.maxOfOrNull { it.altitudeM } ?: return peaks
        val scored = peaks.map { peak ->
            val normAlt = if (maxAlt > 0) peak.altitudeM.toDouble() / maxAlt else 0.0
            val rw = peak.rarityId?.let { rarityWeights[it] } ?: 0.1
            peak to (normAlt * 0.5 + rw * 0.3)
        }.sortedByDescending { it.second }
        val pct = when {
            zoom < 6  -> 0.10
            zoom < 8  -> 0.25
            else      -> 0.50
        }
        val take = maxOf(1, (peaks.size * pct).toInt())
        return scored.take(take).map { it.first }
    }
}

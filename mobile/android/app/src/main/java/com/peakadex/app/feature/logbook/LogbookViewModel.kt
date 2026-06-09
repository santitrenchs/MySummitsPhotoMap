package com.peakadex.app.feature.logbook

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.peakadex.app.AppContainer
import com.peakadex.app.R
import com.peakadex.app.core.analytics.Telemetry
import com.peakadex.app.core.model.Ascent
import com.peakadex.app.core.ui.UiText
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

private const val TAG = "LogbookViewModel"

sealed class LogbookUiState {
    data object Loading : LogbookUiState()
    data class Success(val ascents: List<Ascent>) : LogbookUiState()
    data class Error(val message: UiText) : LogbookUiState()
}

class LogbookViewModel : ViewModel() {

    private val api = AppContainer.apiService

    private val _uiState      = MutableStateFlow<LogbookUiState>(LogbookUiState.Loading)
    val uiState: StateFlow<LogbookUiState> = _uiState.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    // ── Filter state ──────────────────────────────────────────────────────────

    private val _filters = MutableStateFlow(LogbookFilterState())
    val filters: StateFlow<LogbookFilterState> = _filters.asStateFlow()

    // ── Derived: filtered + sorted ascents ───────────────────────────────────
    // Survives configuration changes; reacts to both data and filter mutations.

    val filteredAscents: StateFlow<List<Ascent>> = combine(_uiState, _filters) { state, filters ->
        if (state !is LogbookUiState.Success) emptyList()
        else applyFilters(state.ascents, filters)
    }.stateIn(
        scope         = viewModelScope,
        started       = SharingStarted.WhileSubscribed(5_000),
        initialValue  = emptyList(),
    )

    private var currentJob: Job? = null

    init { load() }

    fun load() {
        currentJob?.cancel()
        currentJob = viewModelScope.launch {
            _uiState.value = LogbookUiState.Loading
            fetch()
        }
    }

    fun refresh() {
        currentJob?.cancel()
        currentJob = viewModelScope.launch {
            _isRefreshing.value = true
            fetch()
            _isRefreshing.value = false
        }
    }

    // ── Filter mutations ──────────────────────────────────────────────────────

    fun setSearch(q: String)           { _filters.value = _filters.value.copy(search = q) }
    fun setViewFilter(v: ViewFilter)   { _filters.value = _filters.value.copy(viewFilter = v) }
    fun setRarityId(id: String?)       { _filters.value = _filters.value.copy(rarityId = id, mythic = false) }
    fun setMythic(v: Boolean)          { _filters.value = _filters.value.copy(mythic = v, rarityId = null) }
    fun setTimeRange(v: TimeRange)     { _filters.value = _filters.value.copy(timeRange = v) }
    fun setSort(v: SortOrder)          { _filters.value = _filters.value.copy(sort = v) }
    fun setPeakFilter(id: String?, name: String?) {
        _filters.value = _filters.value.copy(peakId = id, peakName = name)
    }

    fun clearFilters() {
        // Preserves search text; only resets the filter panel state.
        _filters.value = LogbookFilterState(search = _filters.value.search)
    }

    private suspend fun fetch() {
        try {
            val response = api.getAscents()
            _uiState.value = LogbookUiState.Success(response.ascents)
            // After the feed loads, mark unseen friends' ascents as seen after a short delay
            // (simulates the user having "seen" them — same behaviour as web).
            // This updates the FeedSeen table so next refresh they appear in date order.
            markUnseenAsSeen(response.ascents)
        } catch (e: CancellationException) {
            throw e   // never swallow cancellation — structured concurrency requires it
        } catch (e: HttpException) {
            Log.e(TAG, "getAscents HTTP ${e.code()}")
            _uiState.value = LogbookUiState.Error(UiText.Dynamic("Error ${e.code()}"))
        } catch (e: IOException) {
            Log.e(TAG, "getAscents network error", e)
            _uiState.value = LogbookUiState.Error(UiText.StringRes(R.string.error_no_connection))
        } catch (e: Exception) {
            Log.e(TAG, "getAscents unexpected", e)
            _uiState.value = LogbookUiState.Error(UiText.StringRes(R.string.error_unexpected))
        }
    }

    fun shareAscent(id: String) {
        viewModelScope.launch {
            try {
                api.shareAscent(id)
                Telemetry.logEvent(Telemetry.Event.ASCENT_SHARED, mapOf("ascent_id" to id))
                Log.d(TAG, "Ascent $id marked as public for sharing")
            } catch (e: Exception) {
                Log.d(TAG, "shareAscent non-critical failure: ${e.message}")
            }
        }
    }

    private fun markUnseenAsSeen(ascents: List<Ascent>) {
        val unseenIds = ascents.filter { !it.isOwn && it.isUnseen }.map { it.id }
        if (unseenIds.isEmpty()) return
        viewModelScope.launch {
            delay(3_000) // Wait 3s — user has had a chance to see them
            try {
                api.markFeedSeen(mapOf("ascentIds" to unseenIds))
                Log.d(TAG, "Marked ${unseenIds.size} ascent(s) as seen")
            } catch (e: Exception) {
                Log.w(TAG, "markFeedSeen failed (non-critical)", e)
            }
        }
    }
}

package com.peakadex.app.feature.cards

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

private const val TAG = "CardsViewModel"

sealed class CardsUiState {
    data object Loading : CardsUiState()
    data class Success(val ascents: List<Ascent>) : CardsUiState()
    data class Error(val message: UiText) : CardsUiState()
}

class CardsViewModel : ViewModel() {

    private val api = AppContainer.apiService

    private val _uiState      = MutableStateFlow<CardsUiState>(CardsUiState.Loading)
    val uiState: StateFlow<CardsUiState> = _uiState.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    // ── Pagination state ──────────────────────────────────────────────────────
    // The server accumulates the full unseen-friends set on the first page (so no
    // back-dated friend ascent gets buried), then paginates own + seen-friends
    // chronologically. `nextCursor` is the opaque cursor for the next page.

    private val _isLoadingMore = MutableStateFlow(false)
    val isLoadingMore: StateFlow<Boolean> = _isLoadingMore.asStateFlow()

    private val _hasMore = MutableStateFlow(false)
    val hasMore: StateFlow<Boolean> = _hasMore.asStateFlow()

    private var nextCursor: String? = null
    private var loadMoreJob: Job? = null

    // ── Filter state ──────────────────────────────────────────────────────────

    private val _filters = MutableStateFlow(CardsFilterState())
    val filters: StateFlow<CardsFilterState> = _filters.asStateFlow()

    // ── Derived: filtered + sorted ascents ───────────────────────────────────
    // Survives configuration changes; reacts to both data and filter mutations.

    val filteredAscents: StateFlow<List<Ascent>> = combine(_uiState, _filters) { state, filters ->
        if (state !is CardsUiState.Success) emptyList()
        else applyFilters(state.ascents, filters)
    }.stateIn(
        scope         = viewModelScope,
        started       = SharingStarted.WhileSubscribed(5_000),
        initialValue  = emptyList(),
    )

    private var currentJob: Job? = null

    init { load() }

    fun load() {
        loadMoreJob?.cancel()
        currentJob?.cancel()
        currentJob = viewModelScope.launch {
            _uiState.value = CardsUiState.Loading
            fetch()
        }
    }

    fun refresh() {
        loadMoreJob?.cancel()
        currentJob?.cancel()
        currentJob = viewModelScope.launch {
            _isRefreshing.value = true
            fetch()
            _isRefreshing.value = false
        }
    }

    /** Fetches the next page and appends it to the currently loaded ascents. */
    fun loadMore() {
        val cursor = nextCursor
        if (cursor == null || _isLoadingMore.value || _uiState.value !is CardsUiState.Success) return
        loadMoreJob = viewModelScope.launch {
            _isLoadingMore.value = true
            try {
                val response = api.getAscents(cursor = cursor)
                val current = (_uiState.value as? CardsUiState.Success)?.ascents ?: emptyList()
                val existingIds = current.mapTo(HashSet()) { it.id }
                val appended = current + response.ascents.filter { it.id !in existingIds }
                _uiState.value = CardsUiState.Success(appended)
                nextCursor = response.nextCursor
                _hasMore.value = response.hasMore
                markUnseenAsSeen(response.ascents)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.w(TAG, "loadMore failed (non-critical)", e)
            } finally {
                _isLoadingMore.value = false
            }
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
        _filters.value = CardsFilterState(search = _filters.value.search)
    }

    private suspend fun fetch() {
        try {
            // Empty cursor = "first paginated page" (opts into hasMore/nextCursor).
            val response = api.getAscents(cursor = "")
            _uiState.value = CardsUiState.Success(response.ascents)
            nextCursor = response.nextCursor
            _hasMore.value = response.hasMore
            // After the feed loads, mark unseen friends' ascents as seen after a short delay
            // (simulates the user having "seen" them — same behaviour as web).
            // This updates the FeedSeen table so next refresh they appear in date order.
            markUnseenAsSeen(response.ascents)
        } catch (e: CancellationException) {
            throw e   // never swallow cancellation — structured concurrency requires it
        } catch (e: HttpException) {
            Log.e(TAG, "getAscents HTTP ${e.code()}")
            _uiState.value = CardsUiState.Error(UiText.Dynamic("Error ${e.code()}"))
        } catch (e: IOException) {
            Log.e(TAG, "getAscents network error", e)
            _uiState.value = CardsUiState.Error(UiText.StringRes(R.string.error_no_connection))
        } catch (e: Exception) {
            Log.e(TAG, "getAscents unexpected", e)
            _uiState.value = CardsUiState.Error(UiText.StringRes(R.string.error_unexpected))
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

package com.peakadex.app.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.peakadex.app.AppContainer
import com.peakadex.app.R
import com.peakadex.app.core.model.ProfileData
import com.peakadex.app.core.ui.UiText
import com.peakadex.app.core.model.ProfilePeak
import com.peakadex.app.core.model.ProfilePhoto
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

enum class PeakSortMode {
    ALTITUDE_DESC,
    ALTITUDE_ASC,
    COUNT_DESC,
    RECENT,
    ALPHA,
}

sealed interface ProfileUiState {
    data object Loading  : ProfileUiState
    data class Error(val message: UiText) : ProfileUiState
    data class Success(
        val data: ProfileData,
        // Cimas tab
        val peakQuery: String = "",
        val peakRarityFilter: String? = null,   // rarityId or null = all
        val peakSortMode: PeakSortMode = PeakSortMode.ALTITUDE_DESC,
        val peakMythicFilter: Boolean = false,
        val peakRangeFilter: String? = null,
        val filteredPeaks: List<ProfilePeak> = emptyList(),
        // Fotos / Etiquetado tabs: no client-side filter for MVP
    ) : ProfileUiState
}

class ProfileViewModel : ViewModel() {

    private val api = AppContainer.apiService

    private val _state = MutableStateFlow<ProfileUiState>(ProfileUiState.Loading)
    val state: StateFlow<ProfileUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.value = ProfileUiState.Loading
            try {
                val data = api.getProfile()
                _state.value = ProfileUiState.Success(
                    data          = data,
                    filteredPeaks = data.peaks,
                )
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.value = ProfileUiState.Error(UiText.StringRes(R.string.error_load_profile))
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            val current = _state.value
            try {
                val data = api.getProfile()
                _state.value = if (current is ProfileUiState.Success) {
                    current.copy(
                        data          = data,
                        filteredPeaks = applyPeakFilter(
                            peaks        = data.peaks,
                            query        = current.peakQuery,
                            rarityId     = current.peakRarityFilter,
                            sortMode     = current.peakSortMode,
                            mythicFilter = current.peakMythicFilter,
                            rangeFilter  = current.peakRangeFilter,
                        ),
                    )
                } else {
                    ProfileUiState.Success(data = data, filteredPeaks = data.peaks)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // Keep current state on refresh failure — don't regress to error
            }
        }
    }

    fun setPeakQuery(q: String) {
        val s = _state.value as? ProfileUiState.Success ?: return
        _state.value = s.copy(
            peakQuery     = q,
            filteredPeaks = applyPeakFilter(
                peaks        = s.data.peaks,
                query        = q,
                rarityId     = s.peakRarityFilter,
                sortMode     = s.peakSortMode,
                mythicFilter = s.peakMythicFilter,
                rangeFilter  = s.peakRangeFilter,
            ),
        )
    }

    fun setPeakRarityFilter(rarityId: String?) {
        val s = _state.value as? ProfileUiState.Success ?: return
        // Activating a rarity filter clears the mythic filter
        val newMythic = if (rarityId != null) false else s.peakMythicFilter
        _state.value = s.copy(
            peakRarityFilter = rarityId,
            peakMythicFilter = newMythic,
            filteredPeaks    = applyPeakFilter(
                peaks        = s.data.peaks,
                query        = s.peakQuery,
                rarityId     = rarityId,
                sortMode     = s.peakSortMode,
                mythicFilter = newMythic,
                rangeFilter  = s.peakRangeFilter,
            ),
        )
    }

    fun setPeakSortMode(mode: PeakSortMode) {
        val s = _state.value as? ProfileUiState.Success ?: return
        _state.value = s.copy(
            peakSortMode  = mode,
            filteredPeaks = applyPeakFilter(
                peaks        = s.data.peaks,
                query        = s.peakQuery,
                rarityId     = s.peakRarityFilter,
                sortMode     = mode,
                mythicFilter = s.peakMythicFilter,
                rangeFilter  = s.peakRangeFilter,
            ),
        )
    }

    fun setPeakMythicFilter(enabled: Boolean) {
        val s = _state.value as? ProfileUiState.Success ?: return
        // Activating mythic clears the rarity filter
        val newRarity = if (enabled) null else s.peakRarityFilter
        _state.value = s.copy(
            peakMythicFilter = enabled,
            peakRarityFilter = newRarity,
            filteredPeaks    = applyPeakFilter(
                peaks        = s.data.peaks,
                query        = s.peakQuery,
                rarityId     = newRarity,
                sortMode     = s.peakSortMode,
                mythicFilter = enabled,
                rangeFilter  = s.peakRangeFilter,
            ),
        )
    }

    fun setPeakRangeFilter(range: String?) {
        val s = _state.value as? ProfileUiState.Success ?: return
        _state.value = s.copy(
            peakRangeFilter = range,
            filteredPeaks   = applyPeakFilter(
                peaks        = s.data.peaks,
                query        = s.peakQuery,
                rarityId     = s.peakRarityFilter,
                sortMode     = s.peakSortMode,
                mythicFilter = s.peakMythicFilter,
                rangeFilter  = range,
            ),
        )
    }

    private fun applyPeakFilter(
        peaks: List<ProfilePeak>,
        query: String,
        rarityId: String?,
        sortMode: PeakSortMode,
        mythicFilter: Boolean,
        rangeFilter: String?,
    ): List<ProfilePeak> {
        var result = peaks

        if (query.isNotBlank()) {
            val q = query.trim().lowercase()
            result = result.filter {
                it.name.lowercase().contains(q) ||
                it.mountainRange?.lowercase()?.contains(q) == true ||
                it.country?.lowercase()?.contains(q) == true
            }
        }

        if (rarityId != null) {
            result = result.filter { it.rarityId == rarityId }
        }

        if (mythicFilter) {
            result = result.filter { it.isMythic }
        }

        if (rangeFilter != null) {
            result = result.filter { it.mountainRange == rangeFilter }
        }

        result = when (sortMode) {
            PeakSortMode.ALTITUDE_DESC -> result.sortedByDescending { it.altitudeM }
            PeakSortMode.ALTITUDE_ASC  -> result.sortedBy { it.altitudeM }
            PeakSortMode.COUNT_DESC    -> result.sortedByDescending { it.count }
            PeakSortMode.RECENT        -> result.sortedByDescending { it.lastDate }
            PeakSortMode.ALPHA         -> result.sortedBy { it.name }
        }

        return result
    }
}

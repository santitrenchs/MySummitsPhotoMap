package com.peakadex.app.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.peakadex.app.AppContainer
import com.peakadex.app.core.model.ProfileData
import com.peakadex.app.core.model.ProfilePeak
import com.peakadex.app.core.model.ProfilePhoto
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface ProfileUiState {
    data object Loading  : ProfileUiState
    data class Error(val message: String) : ProfileUiState
    data class Success(
        val data: ProfileData,
        // Cimas tab
        val peakQuery: String = "",
        val peakRarityFilter: String? = null,   // rarityId or null = all
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
                _state.value = ProfileUiState.Error("Error al cargar el perfil")
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
                        filteredPeaks = applyPeakFilter(data.peaks, current.peakQuery, current.peakRarityFilter),
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
            filteredPeaks = applyPeakFilter(s.data.peaks, q, s.peakRarityFilter),
        )
    }

    fun setPeakRarityFilter(rarityId: String?) {
        val s = _state.value as? ProfileUiState.Success ?: return
        _state.value = s.copy(
            peakRarityFilter = rarityId,
            filteredPeaks    = applyPeakFilter(s.data.peaks, s.peakQuery, rarityId),
        )
    }

    private fun applyPeakFilter(
        peaks: List<ProfilePeak>,
        query: String,
        rarityId: String?,
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
        return result
    }
}

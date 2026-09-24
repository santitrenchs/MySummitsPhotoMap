package com.peakadex.app.feature.challenges

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.peakadex.app.AppContainer
import com.peakadex.app.core.model.ChallengeDetail
import com.peakadex.app.core.model.ChallengePeakRow
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class ChallengeStatusFilter { ALL, DONE, PENDING }

enum class ChallengeSort { ALTITUDE_DESC, ALTITUDE_ASC, COMARCA, RANGE }

data class ChallengeDetailUiState(
    val isLoading: Boolean = true,
    val challenge: ChallengeDetail? = null,
    val query: String = "",
    val status: ChallengeStatusFilter = ChallengeStatusFilter.ALL,
    val sort: ChallengeSort = ChallengeSort.ALTITUDE_DESC,
    val error: String? = null,
) {
    private val peaks: List<ChallengePeakRow> get() = challenge?.peaks ?: emptyList()

    /**
     * Comarca y cordillera solo se ofrecen como orden cuando **este** reto tiene al
     * menos dos valores distintos. Están pobladas en ~10% del catálogo y son null en
     * todas las cimas de los retos reales, así que ofrecerlas siempre sería enseñar
     * chips que no hacen nada.
     */
    val canSortByComarca: Boolean get() = peaks.mapNotNull { it.comarca }.distinct().size >= 2
    val canSortByRange: Boolean get() = peaks.mapNotNull { it.mountainRange }.distinct().size >= 2

    val filtered: List<ChallengePeakRow> get() {
        val q = query.trim()
        var rows = peaks
        if (q.isNotEmpty()) rows = rows.filter { it.name.contains(q, ignoreCase = true) }
        rows = when (status) {
            ChallengeStatusFilter.ALL -> rows
            ChallengeStatusFilter.DONE -> rows.filter { it.done }
            ChallengeStatusFilter.PENDING -> rows.filter { !it.done }
        }
        // Los órdenes geográficos agrupan alfabéticamente, dejan al final las cimas
        // sin valor y desempatan por altitud descendente.
        return when (sort) {
            // ⚠️ Siempre en metros: convertir a pies antes de ordenar no aporta nada
            // y rompe la regla de que toda comparación del proyecto es métrica.
            ChallengeSort.ALTITUDE_DESC -> rows.sortedByDescending { it.altitudeM }
            ChallengeSort.ALTITUDE_ASC -> rows.sortedBy { it.altitudeM }
            ChallengeSort.COMARCA -> rows.sortedWith(
                compareBy<ChallengePeakRow> { it.comarca == null }
                    .thenBy { it.comarca ?: "" }
                    .thenByDescending { it.altitudeM },
            )
            ChallengeSort.RANGE -> rows.sortedWith(
                compareBy<ChallengePeakRow> { it.mountainRange == null }
                    .thenBy { it.mountainRange ?: "" }
                    .thenByDescending { it.altitudeM },
            )
        }
    }

    val doneRows: List<ChallengePeakRow> get() = filtered.filter { it.done }
    val pendingRows: List<ChallengePeakRow> get() = filtered.filter { !it.done }
}

class ChallengeDetailViewModel : ViewModel() {

    private val api = AppContainer.apiService

    private val _state = MutableStateFlow(ChallengeDetailUiState())
    val state: StateFlow<ChallengeDetailUiState> = _state.asStateFlow()

    private var loadedId: String? = null

    fun load(challengeId: String) {
        if (loadedId == challengeId && _state.value.challenge != null) return
        loadedId = challengeId
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val c = api.getChallengeDetail(challengeId).challenge
                _state.update { it.copy(isLoading = false, challenge = c) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.localizedMessage) }
            }
        }
    }

    fun onQuery(q: String) = _state.update { it.copy(query = q) }
    fun onStatus(f: ChallengeStatusFilter) = _state.update { it.copy(status = f) }
    fun onSort(s: ChallengeSort) = _state.update { it.copy(sort = s) }

    /** Salir del reto. `onLeft` solo se invoca si el servidor confirma. */
    fun leave(onLeft: () -> Unit) {
        val id = loadedId ?: return
        viewModelScope.launch {
            try {
                api.leaveChallenge(id)
                onLeft()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // Nunca navegar en el catch: cerraría la pantalla dejando al usuario
                // creyendo que ha salido cuando sigue dentro.
                _state.update { it.copy(error = e.localizedMessage) }
            }
        }
    }
}

package com.peakadex.app.feature.challenges

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.peakadex.app.AppContainer
import com.peakadex.app.core.model.ChallengeAvailable
import com.peakadex.app.core.model.ChallengeSummary
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ChallengesUiState(
    val isLoading: Boolean = true,
    val mine: List<ChallengeSummary> = emptyList(),
    val available: List<ChallengeAvailable> = emptyList(),
    /** Búsqueda del listado principal. La de la hoja es independiente. */
    val query: String = "",
    val sheetQuery: String = "",
    /** Id del reto al que se está uniendo, para el estado del botón. */
    val joiningId: String? = null,
    val joinFailed: Boolean = false,
    val error: String? = null,
) {
    /** Los ya unidos siguen en `available`, marcados — hay que excluirlos al contar. */
    val availableCount: Int get() = available.count { !it.isJoined }

    val filteredMine: List<ChallengeSummary> get() =
        if (query.isBlank()) mine
        else mine.filter { it.name.contains(query.trim(), ignoreCase = true) }

    /**
     * El catálogo es curado y pequeño (11 retos en producción), así que la búsqueda
     * de la hoja filtra en local. No merece un viaje al servidor.
     */
    val filteredAvailable: List<ChallengeAvailable> get() =
        if (sheetQuery.isBlank()) available
        else available.filter { it.name.contains(sheetQuery.trim(), ignoreCase = true) }
}

class ChallengesViewModel : ViewModel() {

    private val api = AppContainer.apiService

    private val _state = MutableStateFlow(ChallengesUiState())
    val state: StateFlow<ChallengesUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val res = api.getChallenges()
                _state.update {
                    it.copy(isLoading = false, mine = res.mine, available = res.available)
                }
            } catch (e: CancellationException) {
                throw e   // estructurada: nunca tragarla
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.localizedMessage) }
            }
        }
    }

    fun onQueryChange(q: String) = _state.update { it.copy(query = q) }
    fun onSheetQueryChange(q: String) = _state.update { it.copy(sheetQuery = q) }
    fun clearJoinError() = _state.update { it.copy(joinFailed = false) }

    /**
     * Unirse, de forma optimista: el reto aparece en "Mis retos" antes de que
     * responda el servidor, porque es lo único que confirma al usuario dónde ha
     * ido a parar lo que acaba de tocar.
     *
     * `onJoined` cierra la hoja. Se llama al empezar, no al terminar: esperar a la
     * red dejaría la hoja abierta encima del cambio que el usuario quiere ver.
     *
     * Si falla se revierte el estado y se marca `joinFailed`; no se recarga desde
     * el servidor, que borraría además la búsqueda que tuviera escrita.
     */
    fun join(challenge: ChallengeAvailable, onJoined: () -> Unit) {
        val before = _state.value
        if (before.joiningId != null) return   // un join a la vez

        _state.update { s ->
            s.copy(
                joiningId = challenge.id,
                joinFailed = false,
                mine = s.mine + ChallengeSummary(
                    id = challenge.id,
                    slug = challenge.slug,
                    name = challenge.name,
                    description = challenge.description,
                    coverUrl = challenge.coverUrl,
                    totalPeaks = challenge.totalPeaks,
                    // El progreso real llega con la recarga: un reto recién unido
                    // puede tener cimas ya hechas de antes, así que 0 es solo el
                    // valor provisional del primer frame.
                    completedPeaks = 0,
                ),
                available = s.available.map {
                    if (it.id == challenge.id) it.copy(isJoined = true) else it
                },
            )
        }
        onJoined()

        viewModelScope.launch {
            try {
                api.joinChallenge(challenge.id)
                // Recarga para traer el progreso real, que el optimismo no sabe.
                val res = api.getChallenges()
                _state.update {
                    it.copy(joiningId = null, mine = res.mine, available = res.available)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _state.update {
                    it.copy(joiningId = null, joinFailed = true, mine = before.mine, available = before.available)
                }
            }
        }
    }
}

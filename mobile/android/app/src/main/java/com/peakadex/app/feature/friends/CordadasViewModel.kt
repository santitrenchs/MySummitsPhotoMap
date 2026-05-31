package com.peakadex.app.feature.friends

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.peakadex.app.AppContainer
import com.peakadex.app.core.model.CordadaDetail
import com.peakadex.app.core.model.CordadaInvite
import com.peakadex.app.core.model.CordadaSummary
import com.peakadex.app.core.model.UserStub
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class CordadasUiState(
    val isLoading: Boolean = true,
    val cordadas: List<CordadaSummary> = emptyList(),
    val pendingInvites: List<CordadaInvite> = emptyList(),
    val error: String? = null,
    // Detail sheet
    val selectedDetail: CordadaDetail? = null,
    val isLoadingDetail: Boolean = false,
    // Invite sheet
    val inviteQuery: String = "",
    val inviteResults: List<UserStub> = emptyList(),
    val isSearchingInvite: Boolean = false,
    val inviteSentIds: Set<String> = emptySet(),
)

class CordadasViewModel : ViewModel() {

    private val api = AppContainer.apiService

    private val _state = MutableStateFlow(CordadasUiState())
    val state: StateFlow<CordadasUiState> = _state.asStateFlow()

    private var searchJob: Job? = null

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val data = api.getCordadas()
                _state.update {
                    it.copy(
                        isLoading     = false,
                        cordadas      = data.cordadas,
                        pendingInvites = data.pendingInvites,
                    )
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.localizedMessage) }
            }
        }
    }

    fun createCordada(name: String, description: String?) {
        viewModelScope.launch {
            try {
                val body = buildMap<String, String> {
                    put("name", name)
                    if (!description.isNullOrBlank()) put("description", description)
                }
                api.createCordada(body)
                load()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                android.util.Log.e("CordadasVM", "createCordada error", e)
                _state.update { it.copy(error = e.localizedMessage) }
            }
        }
    }

    fun respondToInvite(cordadaId: String, action: String) {
        viewModelScope.launch {
            try {
                api.respondToCordadaInvite(cordadaId, mapOf("action" to action))
                _state.update {
                    it.copy(pendingInvites = it.pendingInvites.filter { inv -> inv.cordadaId != cordadaId })
                }
                if (action == "ACCEPTED") load()
            } catch (_: Exception) {}
        }
    }

    fun openDetail(cordadaId: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoadingDetail = true, selectedDetail = null, inviteQuery = "", inviteResults = emptyList(), inviteSentIds = emptySet()) }
            try {
                val resp = api.getCordadaDetail(cordadaId)
                _state.update { it.copy(isLoadingDetail = false, selectedDetail = resp.cordada) }
            } catch (_: Exception) {
                _state.update { it.copy(isLoadingDetail = false) }
            }
        }
    }

    fun closeDetail() {
        _state.update { it.copy(selectedDetail = null, inviteQuery = "", inviteResults = emptyList(), inviteSentIds = emptySet()) }
    }

    fun onInviteQueryChange(query: String) {
        _state.update { it.copy(inviteQuery = query, inviteResults = emptyList()) }
        searchJob?.cancel()
        if (query.trim().length < 2) return
        searchJob = viewModelScope.launch {
            delay(350)
            _state.update { it.copy(isSearchingInvite = true) }
            try {
                val resp = api.searchUsers(query.trim())
                // Exclude current members
                val memberIds = _state.value.selectedDetail?.members?.map { it.userId }?.toSet() ?: emptySet()
                _state.update {
                    it.copy(
                        isSearchingInvite = false,
                        inviteResults = resp.users.filter { u -> u.id !in memberIds },
                    )
                }
            } catch (_: Exception) {
                _state.update { it.copy(isSearchingInvite = false) }
            }
        }
    }

    fun inviteUser(cordadaId: String, user: UserStub) {
        viewModelScope.launch {
            try {
                api.inviteToCordada(cordadaId, mapOf("userId" to user.id))
                _state.update { it.copy(inviteSentIds = it.inviteSentIds + user.id) }
            } catch (_: Exception) {}
        }
    }

    fun removeMember(cordadaId: String, userId: String) {
        viewModelScope.launch {
            try {
                api.removeCordadaMember(cordadaId, userId)
                _state.update { s ->
                    s.copy(
                        selectedDetail = s.selectedDetail?.copy(
                            members = s.selectedDetail.members.filter { it.userId != userId }
                        )
                    )
                }
            } catch (_: Exception) {}
        }
    }

    fun leaveCordada(cordadaId: String, myUserId: String) {
        viewModelScope.launch {
            try {
                api.removeCordadaMember(cordadaId, myUserId)
                _state.update { it.copy(selectedDetail = null) }
                load()
            } catch (_: Exception) {}
        }
    }

    fun deleteCordada(cordadaId: String) {
        viewModelScope.launch {
            try {
                api.deleteCordada(cordadaId)
                _state.update { it.copy(selectedDetail = null) }
                load()
            } catch (_: Exception) {}
        }
    }
}

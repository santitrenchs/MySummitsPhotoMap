package com.peakadex.app.feature.friends

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.peakadex.app.AppContainer
import com.peakadex.app.core.model.CordadaDetail
import com.peakadex.app.core.model.CordadaInvite
import com.peakadex.app.core.model.CordadaSummary
import com.peakadex.app.core.model.CreateCordadaRequest
import com.peakadex.app.core.model.UserStub
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody

data class CordadasUiState(
    val isLoading: Boolean = true,
    val isCreating: Boolean = false,
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

    /**
     * Creates a cordada with optional members (must be accepted friends — validated
     * server-side) and an optional avatar. The avatar is uploaded after creation using
     * the returned cordada id (owner-only endpoint).
     */
    fun createCordada(
        name: String,
        description: String?,
        memberIds: List<String> = emptyList(),
        avatarBytes: ByteArray? = null,
        onSuccess: (cordadaId: String) -> Unit = {},
    ) {
        viewModelScope.launch {
            _state.update { it.copy(isCreating = true, error = null) }
            try {
                val created = api.createCordada(
                    CreateCordadaRequest(
                        name        = name,
                        description = description?.ifBlank { null },
                        memberIds   = memberIds.ifEmpty { null },
                    )
                )
                var avatarFailed = false
                if (avatarBytes != null) {
                    val avatarUpload = runCatching {
                        val part = okhttp3.MultipartBody.Part.createFormData(
                            "file", "cordada.jpg",
                            avatarBytes.toRequestBody("image/jpeg".toMediaType()),
                        )
                        api.uploadCordadaAvatar(created.cordada.id, part)
                    }
                    if (avatarUpload.isFailure) {
                        avatarFailed = true
                    }
                }
                load()
                if (avatarFailed) {
                    _state.update { it.copy(error = "avatar_upload_failed") }
                }
                _state.update { it.copy(isCreating = false) }
                onSuccess(created.cordada.id)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                android.util.Log.e("CordadasVM", "createCordada error", e)
                _state.update { it.copy(isCreating = false, error = e.localizedMessage) }
            }
        }
    }

    fun clearError() {
        _state.update { it.copy(error = null) }
    }

    /** Owner-only: replaces an existing cordada's avatar, then refreshes the detail + list. */
    fun updateCordadaAvatar(cordadaId: String, avatarBytes: ByteArray) {
        viewModelScope.launch {
            try {
                val part = okhttp3.MultipartBody.Part.createFormData(
                    "file", "cordada.jpg",
                    avatarBytes.toRequestBody("image/jpeg".toMediaType()),
                )
                api.uploadCordadaAvatar(cordadaId, part)
                // Refresh detail so the new avatarUrl is reflected.
                val resp = api.getCordadaDetail(cordadaId)
                _state.update { it.copy(selectedDetail = resp.cordada) }
                load()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                android.util.Log.e("CordadasVM", "updateCordadaAvatar error", e)
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

    fun leaveCordada(cordadaId: String, myUserId: String, onSuccess: () -> Unit = {}) {
        android.util.Log.d("CordadasVM", "leaveCordada START — cordadaId=$cordadaId myUserId='$myUserId'")
        // Optimistic removal
        _state.update { s ->
            android.util.Log.d("CordadasVM", "leaveCordada optimistic — cordadas before=${s.cordadas.size}")
            s.copy(
                cordadas       = s.cordadas.filter { it.id != cordadaId },
                selectedDetail = null,
            )
        }
        viewModelScope.launch {
            try {
                android.util.Log.d("CordadasVM", "leaveCordada calling API…")
                api.removeCordadaMember(cordadaId, myUserId)
                android.util.Log.d("CordadasVM", "leaveCordada API OK — calling onSuccess + load")
                onSuccess()
                load()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                android.util.Log.e("CordadasVM", "leaveCordada API FAILED: ${e.javaClass.simpleName} — ${e.message}", e)
                load()
                onSuccess()
            }
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

package com.peakadex.app.feature.friends

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.peakadex.app.AppContainer
import com.peakadex.app.core.model.FriendEntry
import com.peakadex.app.core.model.IncomingRequest
import com.peakadex.app.core.model.UserStub
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class FriendsUiState(
    val isLoading: Boolean = true,
    val friends: List<FriendEntry> = emptyList(),
    val incoming: List<IncomingRequest> = emptyList(),
    val searchQuery: String = "",
    val searchResults: List<UserStub> = emptyList(),
    val isSearching: Boolean = false,
    val error: String? = null,
)

enum class FriendshipStatus { NONE, PENDING_SENT, PENDING_RECEIVED, ACCEPTED }

class FriendsViewModel : ViewModel() {

    private val api = AppContainer.apiService

    private val _state = MutableStateFlow(FriendsUiState())
    val state: StateFlow<FriendsUiState> = _state.asStateFlow()

    private var searchJob: Job? = null

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val data = api.getFriendsData()
                _state.update {
                    it.copy(
                        isLoading = false,
                        friends   = data.friends,
                        incoming  = data.incoming,
                    )
                }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.localizedMessage) }
            }
        }
    }

    fun onSearchQueryChange(query: String) {
        _state.update { it.copy(searchQuery = query, searchResults = emptyList()) }
        searchJob?.cancel()
        if (query.trim().length < 2) return
        searchJob = viewModelScope.launch {
            delay(350)
            _state.update { it.copy(isSearching = true) }
            try {
                val response = api.searchUsers(query.trim())
                _state.update { it.copy(isSearching = false, searchResults = response.users) }
            } catch (_: Exception) {
                _state.update { it.copy(isSearching = false) }
            }
        }
    }

    fun sendRequest(addressee: UserStub) {
        viewModelScope.launch {
            try {
                api.sendFriendRequest(mapOf("addresseeId" to addressee.id))
                load()
            } catch (_: Exception) {}
        }
    }

    fun accept(request: IncomingRequest) {
        viewModelScope.launch {
            try {
                api.updateFriendship(request.id, mapOf("action" to "ACCEPTED"))
                _state.update { s ->
                    s.copy(
                        incoming = s.incoming.filter { it.id != request.id },
                        friends  = s.friends + FriendEntry(
                            id        = request.id,
                            friend    = request.requester,
                            createdAt = "",
                        ),
                    )
                }
            } catch (_: Exception) {}
        }
    }

    fun reject(requestId: String) {
        viewModelScope.launch {
            try {
                api.updateFriendship(requestId, mapOf("action" to "REJECTED"))
                _state.update { it.copy(incoming = it.incoming.filter { r -> r.id != requestId }) }
            } catch (_: Exception) {}
        }
    }

    fun removeFriend(friendshipId: String) {
        viewModelScope.launch {
            try {
                api.deleteFriendship(friendshipId)
                _state.update { it.copy(friends = it.friends.filter { f -> f.id != friendshipId }) }
            } catch (_: Exception) {}
        }
    }

    fun friendshipStatus(userId: String): FriendshipStatus {
        val s = _state.value
        if (s.friends.any { it.friend.id == userId }) return FriendshipStatus.ACCEPTED
        if (s.incoming.any { it.requester.id == userId }) return FriendshipStatus.PENDING_RECEIVED
        return FriendshipStatus.NONE
    }
}

package com.peakadex.app.core.auth

import com.peakadex.app.core.api.AuthInterceptor
import com.peakadex.app.core.model.User
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AuthSession(
    private val tokenStorage: TokenStorage,
    private val authInterceptor: AuthInterceptor,
) {
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    val isAuthenticated: Boolean
        get() = tokenStorage.getToken() != null

    init {
        // Restore token + cached user profile on app start
        tokenStorage.getToken()?.let { token ->
            authInterceptor.token = token
            val name = tokenStorage.getSavedUserName()
            if (name != null) {
                _currentUser.value = User(
                    id        = "",
                    name      = name,
                    avatarUrl = tokenStorage.getSavedAvatarUrl(),
                )
            }
        }
    }

    fun login(token: String, user: User) {
        tokenStorage.saveToken(token)
        tokenStorage.saveUserProfile(user.name, user.avatarUrl)
        authInterceptor.token = token
        _currentUser.value = user
    }

    fun updateUser(user: User) {
        tokenStorage.saveUserProfile(user.name, user.avatarUrl)
        _currentUser.value = user
    }

    fun logout() {
        tokenStorage.deleteToken()
        authInterceptor.token = null
        _currentUser.value = null
    }
}

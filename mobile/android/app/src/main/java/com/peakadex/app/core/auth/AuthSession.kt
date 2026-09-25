package com.peakadex.app.core.auth

import android.content.Context
import com.peakadex.app.core.analytics.Telemetry
import com.peakadex.app.core.api.AuthInterceptor
import com.peakadex.app.core.model.User
import com.peakadex.app.core.push.PushTokenRegistrar
import com.peakadex.app.core.util.UnitsState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AuthSession(
    private val tokenStorage: TokenStorage,
    private val authInterceptor: AuthInterceptor,
    /** Contexto de aplicación. Lo necesita el registro del token de push. */
    private val appContext: Context,
) {
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    // Set when an authenticated API call returns 401 (token expired/revoked).
    // NavGraph observes it and kicks the user back to the login screen.
    private val _sessionExpired = MutableStateFlow(false)
    val sessionExpired: StateFlow<Boolean> = _sessionExpired.asStateFlow()

    val isAuthenticated: Boolean
        get() = tokenStorage.getToken() != null

    init {
        // Restore token + cached user profile on app start
        tokenStorage.getToken()?.let { token ->
            authInterceptor.token = token
            // Before the first frame, so nothing renders in the wrong unit and flips.
            UnitsState.set(tokenStorage.getSavedUnits())
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
        tokenStorage.saveUnits(user.units)
        UnitsState.set(user.units)
        authInterceptor.token = token
        _currentUser.value = user
        _sessionExpired.value = false
        Telemetry.setUser(user.id)
        PushTokenRegistrar.syncOnLogin(appContext)
    }

    /** Called from AuthInterceptor (OkHttp thread) when a 401 arrives with a token attached. */
    fun onUnauthorized() {
        if (tokenStorage.getToken() == null) return  // already logged out
        logout()
        _sessionExpired.value = true
    }

    fun consumeSessionExpired() {
        _sessionExpired.value = false
    }

    fun updateUser(user: User) {
        tokenStorage.saveUserProfile(user.name, user.avatarUrl)
        tokenStorage.saveUnits(user.units)
        UnitsState.set(user.units)
        _currentUser.value = user
        Telemetry.setUser(user.id)
    }

    fun logout() {
        // ⚠️ Antes de borrar el token de autenticación: la baja del dispositivo
        // necesita la cabecera Authorization. Al revés responde 401, el token se
        // queda vivo en el servidor y le llegan notificaciones de esta cuenta a
        // quien use el aparato después.
        PushTokenRegistrar.unregisterOnLogout(appContext)
        tokenStorage.deleteToken()
        authInterceptor.token = null
        _currentUser.value = null
        Telemetry.clearUser()
    }
}

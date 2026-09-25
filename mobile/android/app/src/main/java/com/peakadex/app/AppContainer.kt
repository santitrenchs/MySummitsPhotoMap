package com.peakadex.app

import android.content.Context
import com.peakadex.app.core.api.ApiClient
import com.peakadex.app.core.api.ApiService
import com.peakadex.app.core.api.AuthInterceptor
import com.peakadex.app.core.auth.AuthSession
import com.peakadex.app.core.auth.TokenStorage

/**
 * Manual dependency-injection container.
 * Replaces Hilt, which is not compatible with AGP 9.x.
 *
 * Call [init] once from [PeakadexApp.onCreate].
 * Access singletons via [AppContainer.instance].
 */
object AppContainer {

    private lateinit var _appContext: Context
    private lateinit var _tokenStorage: TokenStorage
    private lateinit var _authInterceptor: AuthInterceptor
    private lateinit var _authSession: AuthSession
    private lateinit var _apiService: ApiService

    /** Contexto de aplicación. Lo necesitan cosas que viven fuera de una pantalla,
     *  como el permiso de notificaciones o el registro del token de push. */
    val appContext: Context get() = _appContext
    val tokenStorage: TokenStorage get() = _tokenStorage
    val authInterceptor: AuthInterceptor get() = _authInterceptor
    val authSession: AuthSession get() = _authSession
    val apiService: ApiService get() = _apiService

    fun init(context: Context) {
        _appContext      = context.applicationContext
        _tokenStorage    = TokenStorage(_appContext)
        _authInterceptor = AuthInterceptor()
        _authSession     = AuthSession(_tokenStorage, _authInterceptor, _appContext)
        _authInterceptor.onUnauthorized = { _authSession.onUnauthorized() }
        _apiService      = ApiClient.buildService(_authInterceptor)
    }
}

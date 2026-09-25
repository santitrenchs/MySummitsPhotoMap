package com.peakadex.app.core.push

import android.content.Context
import android.util.Log
import com.google.firebase.messaging.FirebaseMessaging
import com.peakadex.app.AppContainer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * El ciclo de vida del token de FCM: alta al iniciar sesión, baja al cerrarla.
 *
 * Vive fuera de cualquier ViewModel porque [PeakadexMessagingService] también lo
 * llama, y ese servicio lo instancia el sistema sin pantalla ninguna delante.
 *
 * Todo es best-effort: un fallo al registrar no puede impedir entrar en la app.
 * Lo peor que pasa es que no lleguen notificaciones hasta el próximo arranque,
 * porque [syncOnLogin] se ejecuta cada vez.
 */
object PushTokenRegistrar {

    private const val TAG = "PushTokenRegistrar"
    private const val PREFS = "push_prefs"
    private const val KEY_PENDING = "pending_token"
    private const val KEY_REGISTERED = "registered_token"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /**
     * FCM entregó un token nuevo.
     *
     * Si no hay sesión se guarda y basta: sin usuario no hay a quién asociarlo, y
     * registrarlo con el anterior se lo entregaría a quien ya no toca.
     */
    fun onTokenRefreshed(context: Context, token: String) {
        prefs(context).edit().putString(KEY_PENDING, token).apply()
        if (AppContainer.authSession.currentUser.value == null) return
        register(context, token)
    }

    /**
     * Al iniciar sesión, y en cada arranque con sesión activa.
     *
     * Pide el token a FCM en vez de fiarse del guardado: puede haber rotado con la
     * app cerrada, y entonces `onNewToken` corrió sin sesión.
     */
    fun syncOnLogin(context: Context) {
        scope.launch {
            try {
                val token = FirebaseMessaging.getInstance().token.await()
                register(context, token)
            } catch (e: Exception) {
                Log.w(TAG, "no se pudo obtener el token de FCM", e)
            }
        }
    }

    /**
     * Al cerrar sesión.
     *
     * ⚠️ Se llama **antes** de borrar el token de autenticación: la petición de
     * baja necesita la cabecera Authorization. Al revés responde 401 y el token
     * se queda vivo en el servidor, mandándole notificaciones de esta cuenta a
     * quien use el aparato después.
     */
    fun unregisterOnLogout(context: Context) {
        val token = prefs(context).getString(KEY_REGISTERED, null)
            ?: prefs(context).getString(KEY_PENDING, null)
            ?: return
        prefs(context).edit().remove(KEY_REGISTERED).apply()
        scope.launch {
            try {
                AppContainer.apiService.unregisterDevice(mapOf("token" to token))
            } catch (e: Exception) {
                Log.w(TAG, "no se pudo dar de baja el token", e)
            }
        }
    }

    private fun register(context: Context, token: String) {
        scope.launch {
            try {
                AppContainer.apiService.registerDevice(
                    mapOf("token" to token, "platform" to "android"),
                )
                prefs(context).edit()
                    .putString(KEY_REGISTERED, token)
                    .remove(KEY_PENDING)
                    .apply()
            } catch (e: Exception) {
                // Se queda en KEY_PENDING: el próximo arranque con sesión lo
                // reintenta desde syncOnLogin.
                Log.w(TAG, "no se pudo registrar el token", e)
            }
        }
    }
}

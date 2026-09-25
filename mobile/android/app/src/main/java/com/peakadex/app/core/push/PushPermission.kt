package com.peakadex.app.core.push

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * El permiso de notificaciones y el momento de pedirlo.
 *
 * ⚠️ Desde Android 13 `POST_NOTIFICATIONS` es un permiso en tiempo de ejecución y
 * **el sistema solo deja mostrar el diálogo una vez**. Denegado, la app ya no
 * puede volver a preguntar: el usuario tendría que ir a los ajustes del sistema.
 * En Android 12 y anteriores se concede al instalar.
 *
 * De ahí que antes del diálogo del sistema vaya una hoja de explicación propia:
 * si el usuario dice que no ahí, la única bala queda sin gastar.
 */
object PushPermission {

    private const val PREFS = "push_prefs"
    private const val KEY_PRIMING_SHOWN = "priming_shown"

    /** Hace falta pedirlo explícitamente. Antes de 13 se concede al instalar. */
    val needsRuntimeRequest: Boolean
        get() = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU

    fun isGranted(context: Context): Boolean {
        if (!needsRuntimeRequest) return true
        return ContextCompat.checkSelfPermission(
            context, Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Los ajustes del sistema para esta app.
     *
     * Es la única salida cuando el permiso está denegado: el interruptor de
     * Ajustes no puede mostrar el diálogo, y uno que no hace nada al pulsarlo es
     * peor que no tenerlo.
     */
    fun openAppSettings(context: Context) {
        val intent = Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.fromParts("package", context.packageName, null),
        ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
        runCatching { context.startActivity(intent) }
    }

    // ── El momento de pedirlo ────────────────────────────────────────────────

    private val _showPriming = MutableStateFlow(false)

    /** `MainScaffold` lo observa y muestra la hoja de explicación. */
    val showPriming: StateFlow<Boolean> = _showPriming.asStateFlow()

    /**
     * Llamar tras la primera acción social: mandar una solicitud de amistad o
     * invitar a alguien a una cordada.
     *
     * Es el momento con sentido porque los cuatro eventos con push son cosas que
     * **contesta otra persona más tarde**: ahí «te avisamos cuando responda» es
     * concreto y verificable. Pedirlo al arrancar es el error clásico — la gente
     * deniega por reflejo y se quema la única oportunidad.
     *
     * No hace nada si ya está concedido, si ya se enseñó una vez, o si el sistema
     * no lo necesita.
     */
    fun maybeShowPrimingAfterSocialAction(context: Context) {
        if (!needsRuntimeRequest) return
        if (isGranted(context)) return
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (prefs.getBoolean(KEY_PRIMING_SHOWN, false)) return
        _showPriming.value = true
    }

    /**
     * La hoja se ha cerrado, aceptando o no.
     *
     * Se marca en los dos casos: insistir tras un «ahora no» es justo lo que
     * convierte un permiso en una molestia. Queda el interruptor de Ajustes.
     */
    fun onPrimingDismissed(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_PRIMING_SHOWN, true).apply()
        _showPriming.value = false
    }
}

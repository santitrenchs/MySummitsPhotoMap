package com.peakadex.app.core.push

import android.content.Intent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * A dónde lleva tocar una notificación.
 *
 * El destino viaja en el `data` del mensaje FCM y llega en los extras del
 * intent. `MainActivity` lo deposita aquí y `MainScaffold` lo consume, porque la
 * navegación por pestañas vive en Compose y no en la Activity.
 *
 * ⚠️ Hay **dos caminos** por los que llega el mismo intent, y los dos tienen que
 * funcionar:
 *
 *  - App en primer plano: el aviso lo construye `PeakadexMessagingService`, que
 *    copia el `data` a los extras. Llega por `onNewIntent`.
 *  - App en segundo plano o cerrada: `onMessageReceived` **no se ejecuta**; el
 *    aviso lo construye el sistema con el intent de lanzamiento, y el `data`
 *    aparece igualmente en los extras. Llega por `onCreate`.
 */
sealed interface PushDestination {
    /** Solicitudes de amistad y respuestas. */
    data object Friends : PushDestination
    /** Invitación a una cordada concreta. */
    data class Cordada(val id: String) : PushDestination
    /** Etiquetado en la foto de una ascensión. */
    data class Card(val ascentId: String) : PushDestination
}

object PushNavigation {

    private val _pending = MutableStateFlow<PushDestination?>(null)

    /** `MainScaffold` lo observa; `consume()` lo limpia tras navegar. */
    val pending: StateFlow<PushDestination?> = _pending.asStateFlow()

    /**
     * Lee el destino de los extras de un intent, si lo hay.
     *
     * Devuelve silenciosamente sin hacer nada cuando el intent no viene de una
     * notificación, que es el caso normal: abrir la app desde el icono pasa por
     * aquí igual.
     */
    fun handleIntent(intent: Intent?) {
        val screen = intent?.getStringExtra("screen") ?: return
        _pending.value = when (screen) {
            "friends" -> PushDestination.Friends
            "cordada" -> intent.getStringExtra("id")?.let { PushDestination.Cordada(it) }
            "card"    -> intent.getStringExtra("ascentId")?.let { PushDestination.Card(it) }
            else      -> null
        }
        // Se limpian los extras: sin esto, una rotación de pantalla reentrega el
        // mismo intent y la app vuelve a saltar al destino mientras el usuario
        // estaba ya en otro sitio.
        intent.removeExtra("screen")
        intent.removeExtra("id")
        intent.removeExtra("ascentId")
    }

    fun consume() {
        _pending.value = null
    }
}

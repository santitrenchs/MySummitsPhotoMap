package com.peakadex.app.core.push

import android.Manifest
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.peakadex.app.MainActivity
import com.peakadex.app.R
import kotlin.random.Random

/**
 * Recibe los mensajes de FCM.
 *
 * ⚠️ `onMessageReceived` **no se llama siempre**. Cuando el mensaje lleva bloque
 * `notification` y la app está en segundo plano o cerrada, es el sistema quien
 * construye y muestra el aviso, y este método nunca se ejecuta. Solo corre con la
 * app en primer plano.
 *
 * De ahí que el servidor mande `notification` **y** `data`: el bloque
 * `notification` es lo que el sistema necesita para pintar por su cuenta, y
 * `data` llega en los extras del intent cuando el usuario toca el aviso, que es
 * lo que permite abrir la pantalla correcta.
 */
class PeakadexMessagingService : FirebaseMessagingService() {

    /**
     * FCM rota el token por su cuenta, y también lo entrega la primera vez aquí.
     *
     * Se delega en [PushTokenRegistrar], que decide si hay sesión: sin usuario no
     * hay a quién asociarlo, y se guarda para registrarlo al iniciar sesión.
     */
    override fun onNewToken(token: String) {
        PushTokenRegistrar.onTokenRefreshed(applicationContext, token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        NotificationChannels.ensureCreated(applicationContext)

        val title = message.notification?.title ?: message.data["title"] ?: return
        val body = message.notification?.body ?: message.data["body"] ?: ""
        val channelId = message.notification?.channelId
            ?: message.data["channel"]
            ?: NotificationChannels.SOCIAL

        // Desde Android 13 se puede recibir un push sin permiso para mostrarlo.
        // Publicar sin comprobarlo lanza, así que se sale en silencio: el aviso no
        // se muestra, pero la app tampoco se cae.
        val granted = ContextCompat.checkSelfPermission(
            this, Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
        if (!granted) return

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            // Los mismos extras que pone el sistema cuando construye él el aviso,
            // para que MainActivity solo tenga que leerlos de un sitio (fase 6).
            message.data.forEach { (k, v) -> putExtra(k, v) }
        }
        val pending = PendingIntent.getActivity(
            this,
            Random.nextInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pending)
            .build()

        // Id aleatorio: con un id fijo cada aviso reemplazaría al anterior y tres
        // solicitudes de amistad seguidas dejarían ver solo la última.
        NotificationManagerCompat.from(this).notify(Random.nextInt(), notification)
    }
}

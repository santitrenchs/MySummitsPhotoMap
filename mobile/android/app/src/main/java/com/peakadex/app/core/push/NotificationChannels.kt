package com.peakadex.app.core.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import com.peakadex.app.R

/**
 * Los canales de notificación.
 *
 * Obligatorios desde Android 8: sin un canal declarado, una notificación
 * sencillamente no se muestra. Y son la única forma de que el usuario pueda
 * silenciar una categoría sin silenciarlas todas — por eso hay dos y no uno.
 *
 * ⚠️ Un canal es inmutable una vez creado. Cambiarle la importancia en el código
 * no tiene efecto en quien ya tenga la app instalada: Android respeta a
 * propósito lo que el usuario haya ajustado. Para cambiarla de verdad hay que
 * crear un canal con id nuevo, lo que pierde los ajustes del anterior.
 */
object NotificationChannels {

    /** Amistades y cordadas: alguien espera una respuesta tuya. */
    const val SOCIAL = "social"

    /** Te han etiquetado en una foto. Informativo, no pide nada. */
    const val TAGS = "tags"

    fun ensureCreated(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return

        manager.createNotificationChannel(
            NotificationChannel(
                SOCIAL,
                context.getString(R.string.push_channel_social),
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = context.getString(R.string.push_channel_social_desc)
            },
        )

        manager.createNotificationChannel(
            NotificationChannel(
                TAGS,
                context.getString(R.string.push_channel_tags),
                // Baja a propósito: aparece en la bandeja sin sonido ni ventana
                // emergente. Que te etiqueten es agradable, no urgente.
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = context.getString(R.string.push_channel_tags_desc)
            },
        )
    }
}

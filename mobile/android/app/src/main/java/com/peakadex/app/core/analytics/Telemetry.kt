package com.peakadex.app.core.analytics

import android.content.Context
import android.os.Bundle
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.crashlytics.FirebaseCrashlytics

/**
 * Thin facade over Firebase Analytics + Crashlytics.
 *
 * Keeps Firebase SDK calls in one place so the rest of the app never imports
 * Firebase directly — easier to mock, gate, or swap later. Initialised once from
 * [com.peakadex.app.PeakadexApp.onCreate] via [init].
 *
 * Collection is gated by [init]'s `enabled` flag. We pass `!BuildConfig.DEBUG` so
 * debug builds (which point at the staging API) never pollute production metrics.
 * Calls made before [init] are no-ops.
 */
object Telemetry {

    private var analytics: FirebaseAnalytics? = null
    private val crashlytics get() = FirebaseCrashlytics.getInstance()
    private var enabled = false

    /** Call once at app startup. [enabled] should be `!BuildConfig.DEBUG`. */
    fun init(context: Context, enabled: Boolean) {
        this.enabled = enabled
        analytics = FirebaseAnalytics.getInstance(context.applicationContext)
        analytics?.setAnalyticsCollectionEnabled(enabled)
        crashlytics.isCrashlyticsCollectionEnabled = enabled
    }

    // ── Screen tracking ────────────────────────────────────────────────

    /** Logs a SCREEN_VIEW for the given nav route (e.g. "home", "cards"). */
    fun logScreen(route: String?) {
        val name = route ?: return
        analytics?.logEvent(
            FirebaseAnalytics.Event.SCREEN_VIEW,
            Bundle().apply {
                putString(FirebaseAnalytics.Param.SCREEN_NAME, name)
                putString(FirebaseAnalytics.Param.SCREEN_CLASS, name)
            },
        )
    }

    // ── Custom events ──────────────────────────────────────────────────

    fun logEvent(name: String, params: Map<String, Any?> = emptyMap()) {
        val bundle = Bundle()
        params.forEach { (key, value) ->
            when (value) {
                null -> Unit
                is String -> bundle.putString(key, value)
                is Int -> bundle.putLong(key, value.toLong())
                is Long -> bundle.putLong(key, value)
                is Double -> bundle.putDouble(key, value)
                is Float -> bundle.putDouble(key, value.toDouble())
                is Boolean -> bundle.putString(key, value.toString())
                else -> bundle.putString(key, value.toString())
            }
        }
        analytics?.logEvent(name, bundle)
    }

    // ── User identity (internal user id only — no PII) ─────────────────

    fun setUser(userId: String?) {
        if (userId.isNullOrBlank()) return
        analytics?.setUserId(userId)
        crashlytics.setUserId(userId)
    }

    fun clearUser() {
        analytics?.setUserId(null)
        crashlytics.setUserId("")
    }

    // ── Non-fatal error reporting ──────────────────────────────────────

    /** Report a handled exception to Crashlytics without crashing the app. */
    fun recordError(throwable: Throwable) {
        crashlytics.recordException(throwable)
    }

    /** Canonical event names. Custom ones ≤40 chars, snake_case. */
    object Event {
        // Reserved Firebase events — use the standard names so they map to the
        // built-in funnels in the Analytics console.
        const val LOGIN = FirebaseAnalytics.Event.LOGIN
        const val SIGN_UP = FirebaseAnalytics.Event.SIGN_UP
        // Custom events.
        const val ASCENT_CREATED = "ascent_created"
        const val ASCENT_SHARED = "ascent_shared"
        const val CORDADA_CREATED = "cordada_created"
        const val FRIEND_INVITED = "friend_invited"
    }

    /** "method" param key shared by login/sign_up (Firebase reserved param). */
    const val PARAM_METHOD = "method"
}

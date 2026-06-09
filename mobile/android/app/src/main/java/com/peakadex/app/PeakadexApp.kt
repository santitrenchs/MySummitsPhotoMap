package com.peakadex.app

import android.app.Application
import com.peakadex.app.core.analytics.Telemetry
import org.maplibre.android.MapLibre

class PeakadexApp : Application() {

    override fun onCreate() {
        super.onCreate()
        // Initialise the manual DI graph (no Hilt — AGP 9.x incompatibility)
        AppContainer.init(this)
        // Firebase Analytics + Crashlytics. Disabled on debug builds (staging API)
        // so development traffic never pollutes production metrics.
        Telemetry.init(this, enabled = !BuildConfig.DEBUG)
        // MapLibre requires explicit initialisation before any MapView is created
        MapLibre.getInstance(this)
    }
}

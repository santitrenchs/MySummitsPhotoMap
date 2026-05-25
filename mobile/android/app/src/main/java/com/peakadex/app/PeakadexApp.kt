package com.peakadex.app

import android.app.Application
import org.maplibre.android.MapLibre

class PeakadexApp : Application() {

    override fun onCreate() {
        super.onCreate()
        // Initialise the manual DI graph (no Hilt — AGP 9.x incompatibility)
        AppContainer.init(this)
        // MapLibre requires explicit initialisation before any MapView is created
        MapLibre.getInstance(this)
    }
}

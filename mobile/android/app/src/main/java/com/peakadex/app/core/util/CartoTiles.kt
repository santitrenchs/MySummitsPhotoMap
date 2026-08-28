package com.peakadex.app.core.util

import com.peakadex.app.BuildConfig

/**
 * CARTO basemap tile URLs — single source of truth for every map surface.
 *
 * CARTO enforces an API key on their basemap CDN: without a `key` query param the
 * tiles come back with an "API KEY REQUIRED" watermark stamped on them at every
 * zoom level. The key is free (5M tile requests/month) and public by design (it
 * ships inside the APK), but the repo is public, so it comes from the Gradle
 * property CARTO_API_KEY in ~/.gradle/gradle.properties — see app/build.gradle.kts.
 */
object CartoTiles {

    private val keyParam: String =
        if (BuildConfig.CARTO_API_KEY.isNotBlank()) "?key=${BuildConfig.CARTO_API_KEY}" else ""

    /** Voyager raster tiles for the MapLibre basemap source, sharded across CARTO's CDN. */
    val basemapUrls: Array<String> = arrayOf("a", "b", "c").map { sub ->
        "https://$sub.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png$keyParam"
    }.toTypedArray()

    /** A single @2x tile, used by the card-back mini-map which composites tiles by hand. */
    fun tileUrl(zoom: Int, x: Int, y: Int): String =
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/$zoom/$x/$y@2x.png$keyParam"
}

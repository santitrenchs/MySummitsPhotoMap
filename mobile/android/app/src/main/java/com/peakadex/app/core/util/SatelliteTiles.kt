package com.peakadex.app.core.util

import com.peakadex.app.BuildConfig

/**
 * Satellite imagery tile URLs — single source of truth for every map surface.
 *
 * Tiles come from the `peakadex-satellite-tiles` Cloudflare Worker (see
 * `workers/satellite-tiles/`), never straight from Esri. The proxy keeps the
 * ArcGIS API key out of the APK, absorbs repeat tiles in the edge cache so the
 * upstream free tier stretches, and lets the imagery provider change without an
 * app release.
 *
 * ⚠️ The Worker exposes conventional XYZ (`{z}/{x}/{y}`). Esri's own service is
 * level/row/col (`{z}/{y}/{x}`) — that swap now lives in the Worker, so do not
 * reintroduce it here.
 */
object SatelliteTiles {

    /**
     * The service itself goes to 23, but global coverage is only reliable to 19
     * — beyond that Esri has high-resolution imagery in select areas only.
     * Capping here makes MapLibre overzoom a blurry tile past 19 instead of
     * leaving holes in the map, which reads as broken.
     */
    const val MAX_ZOOM: Float = 19f

    /**
     * Required credit for Esri imagery, wording as the Basemap Styles service
     * reports it for World_Imagery.
     *
     * ⚠️ It MUST be an HTML anchor. MapLibre's `AttributionParser` runs the
     * source attribution through `Html.fromHtml` and keeps only the `URLSpan`s
     * it finds — a plain-text credit yields no entries at all and silently never
     * reaches the (i) dialog, which is exactly how this shipped unnoticed the
     * first time. The whole credit goes inside the link text so none of it is
     * dropped.
     */
    const val ATTRIBUTION: String =
        "<a href=\"https://www.esri.com/en-us/legal/copyright-trademarks\">" +
            "Source: Esri, Vantor, GeoEye, Earthstar Geographics, CNES/Airbus DS, " +
            "USDA, USGS, AeroGRID, IGN, and the GIS User Community</a>"

    /** Raster tile template for the MapLibre satellite source. */
    val tileUrl: String = BuildConfig.SATELLITE_TILES_URL
}

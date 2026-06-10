package com.peakadex.app.feature.atlas

import android.Manifest
import android.animation.ValueAnimator
import android.view.animation.DecelerateInterpolator
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Shader
import android.location.LocationManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil3.BitmapImage
import coil3.imageLoader
import coil3.request.ImageRequest
import coil3.request.allowHardware
import coil3.size.Size
import com.peakadex.app.R
import com.peakadex.app.core.model.MapAscent
import com.peakadex.app.core.model.Peak
import com.peakadex.app.core.model.Rarity
import com.peakadex.app.core.ui.theme.PeakBlueActive
import com.peakadex.app.core.ui.theme.PeakBorderLight
import com.peakadex.app.core.ui.theme.PeakGreenCTA
import com.peakadex.app.core.ui.theme.PeakClimbedGreen
import com.peakadex.app.core.ui.theme.PeakLayerActiveBg
import com.peakadex.app.core.ui.theme.PeakMuted
import com.peakadex.app.core.ui.theme.PeakNavyDark
import com.peakadex.app.core.ui.theme.PeakOnSurface
import com.peakadex.app.core.ui.theme.PeakSlate
import com.peakadex.app.core.ui.theme.PeakSubtle
import com.peakadex.app.core.ui.theme.PeakSurfaceAlt
import com.peakadex.app.core.ui.theme.PeakSurfaceVariant
import com.peakadex.app.core.ui.theme.PeakTextHeadline
import com.peakadex.app.core.ui.theme.PeakUnclimbedBlue
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.TextButton
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapLibreMapOptions
import org.maplibre.android.maps.MapView
import org.maplibre.android.style.expressions.Expression.get
import org.maplibre.android.style.expressions.Expression.has
import org.maplibre.android.style.expressions.Expression.literal
import org.maplibre.android.style.expressions.Expression.not
import org.maplibre.android.style.expressions.Expression.step
import org.maplibre.android.style.expressions.Expression.stop
import org.maplibre.android.style.expressions.Expression.toNumber
import org.maplibre.android.maps.Style
import org.maplibre.android.style.layers.CircleLayer
import org.maplibre.android.style.layers.HillshadeLayer
import org.maplibre.android.style.layers.Property.NONE
import org.maplibre.android.style.layers.Property.VISIBLE
import org.maplibre.android.style.layers.PropertyFactory.hillshadeExaggeration
import org.maplibre.android.style.layers.PropertyFactory.hillshadeHighlightColor
import org.maplibre.android.style.layers.PropertyFactory.hillshadeShadowColor
import org.maplibre.android.style.layers.PropertyFactory.rasterOpacity
import org.maplibre.android.style.layers.RasterLayer
import org.maplibre.android.style.layers.PropertyFactory.circleColor
import org.maplibre.android.style.layers.PropertyFactory.circleOpacity
import org.maplibre.android.style.layers.PropertyFactory.circleRadius
import org.maplibre.android.style.layers.PropertyFactory.circleStrokeColor
import org.maplibre.android.style.layers.PropertyFactory.circleStrokeWidth
import org.maplibre.android.style.layers.PropertyFactory.iconAllowOverlap
import org.maplibre.android.style.layers.PropertyFactory.iconIgnorePlacement
import org.maplibre.android.style.layers.PropertyFactory.iconImage
import org.maplibre.android.style.layers.PropertyFactory.iconSize
import org.maplibre.android.style.layers.PropertyFactory.textAllowOverlap
import org.maplibre.android.style.layers.PropertyFactory.textAnchor
import org.maplibre.android.style.layers.PropertyFactory.textColor
import org.maplibre.android.style.layers.PropertyFactory.textField
import org.maplibre.android.style.layers.PropertyFactory.textHaloColor
import org.maplibre.android.style.layers.PropertyFactory.textHaloWidth
import org.maplibre.android.style.layers.PropertyFactory.textIgnorePlacement
import org.maplibre.android.style.layers.PropertyFactory.textOffset
import org.maplibre.android.style.layers.PropertyFactory.textSize
import org.maplibre.android.style.layers.PropertyFactory.visibility
import org.maplibre.android.style.layers.SymbolLayer
import org.maplibre.android.style.sources.GeoJsonOptions
import org.maplibre.android.style.sources.GeoJsonSource
import org.maplibre.android.style.sources.RasterSource
import org.maplibre.android.style.sources.TileSet
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt
import org.maplibre.geojson.Feature
import org.maplibre.geojson.FeatureCollection
import org.maplibre.geojson.Point

// ── Map base type ─────────────────────────────────────────────────────────────

enum class MapType { NORMAL, TERRAIN, SATELLITE }

// ── Source / layer IDs ────────────────────────────────────────────────────────

private const val SRC_CLIMBED             = "climbed-source"
private const val SRC_UNCLIMBED           = "unclimbed-source"
private const val SRC_UNCLIMBED_CLUSTERED = "unclimbed-clustered-source"
private const val LYR_CLIMBED             = "climbed-layer"
private const val LYR_UNCLIMBED_CLUSTER   = "unclimbed-cluster-layer"
private const val LYR_UNCLIMBED_SINGLE    = "unclimbed-single-layer"
private const val LYR_UNCLIMBED_LABELS    = "unclimbed-labels-layer"
private const val LYR_CLUSTER_COUNT       = "cluster-count-layer"
private const val DEFAULT_RARITY_COLOR    = "#22C55E"   // green-500
private const val UNCLIMBED_COLOR         = "#3B82F6"   // blue-500

private const val SRC_TERRAIN_DEM         = "terrain-dem"
private const val SRC_TRAILS              = "trails-source"
private const val LYR_HILLSHADE           = "hillshade-layer"
private const val LYR_TRAILS              = "trails-layer"

private const val SRC_SELECTED            = "selected-source"
private const val LYR_SELECTED_GLOW       = "selected-glow-layer"

private const val SRC_SATELLITE           = "satellite-source"
private const val LYR_SATELLITE           = "satellite-layer"

// ── Entry composable ──────────────────────────────────────────────────────────

@Composable
fun AtlasScreen(
    atlasRefreshTrigger: Int = 0,
    onNavigateToCards: (peakId: String, peakName: String) -> Unit = { _, _ -> },
    onNavigateToNewAscent: (peakId: String, peakName: String) -> Unit = { _, _ -> },
    vm: AtlasViewModel = viewModel(),
) {
    val uiState by vm.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    // Reload climbed peaks when a new ascent is created elsewhere in the app.
    LaunchedEffect(atlasRefreshTrigger) {
        if (atlasRefreshTrigger > 0) vm.loadClimbedAscents()
    }

    val mapViewRef    = remember { mutableStateOf<MapView?>(null) }
    val mapRef        = remember { mutableStateOf<MapLibreMap?>(null) }
    val styleReady    = remember { mutableStateOf(false) }
    val cameraCenter  = remember { mutableStateOf<LatLng?>(null) }
    // Incremental marker loading: track which peak IDs are already in the map style
    val loadedMarkerIds    = remember { mutableSetOf<String>() }
    val loadedWithRarities = remember { mutableStateOf(false) }

    // ── Local UI state ────────────────────────────────────────────────────────
    // rememberSaveable: persiste en rotación de pantalla y cambios de configuración
    var showTopBar by rememberSaveable { mutableStateOf(true) }
    var terrain3d  by rememberSaveable { mutableStateOf(false) }
    var mapType    by rememberSaveable { mutableStateOf(MapType.NORMAL) }
    var trails     by rememberSaveable { mutableStateOf(false) }
    // remember: estado transitorio, resetear en rotación es correcto
    var layersOpen    by remember { mutableStateOf(false) }
    var filtersOpen   by remember { mutableStateOf(false) }
    var geoLocating   by remember { mutableStateOf(false) }
    val hasInitialFlown = remember { mutableStateOf(false) }

    // ── Atlas onboarding sheet — shown once until user checks "don't show" ────
    val prefs = remember { context.getSharedPreferences("peakadex_prefs", android.content.Context.MODE_PRIVATE) }
    val onboardingSeen = remember { prefs.getBoolean("map_onboarding_seen", false) }
    var showOnboarding by rememberSaveable { mutableStateOf(!onboardingSeen) }
    android.util.Log.d("AtlasOnboarding", "showOnboarding=$showOnboarding onboardingSeen=$onboardingSeen")

    // ── Location permission + geolocate ──────────────────────────────────────
    val locationPermLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            geoLocating = true
            geoLocateNow(context, mapRef.value) { geoLocating = false }
        }
    }
    fun handleGeolocate() {
        val hasPerm = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_COARSE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
        if (hasPerm) {
            geoLocating = true
            geoLocateNow(context, mapRef.value) { geoLocating = false }
        } else {
            locationPermLauncher.launch(Manifest.permission.ACCESS_COARSE_LOCATION)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {

        // ── Map ───────────────────────────────────────────────────────────────
        AndroidView(
            factory = { ctx ->
                val options = MapLibreMapOptions.createFromAttributes(ctx)
                    .compassEnabled(false)
                    .logoEnabled(false)
                    .attributionEnabled(false)
                MapView(ctx, options).also { mv ->
                    mapViewRef.value = mv
                    // The Activity is already STARTED/RESUMED when the user navigates
                    // to this tab — ON_START and ON_RESUME won't fire again via the
                    // LifecycleEventObserver, so we call them here immediately.
                    mv.onCreate(null)
                    mv.onStart()
                    mv.onResume()
                    mv.getMapAsync { map ->
                        mapRef.value = map

                        // Base style JSON: defines the terrain DEM source and enables
                        // 3D terrain extrusion (exaggeration 1.5). Other sources and
                        // layers are added via withSource/withLayer or post-load.
                        // encoding=terrarium matches the AWS elevation-tiles-prod tiles.
                        val baseStyleJson = """
                            {
                              "version": 8,
                              "sources": {
                                "terrain-dem": {
                                  "type": "raster-dem",
                                  "tiles": ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
                                  "encoding": "terrarium",
                                  "maxzoom": 15
                                }
                              },
                              "terrain": {
                                "source": "terrain-dem",
                                "exaggeration": 1.0
                              },
                              "layers": []
                            }
                        """.trimIndent()

                        val tileSet = TileSet("2.2.0",
                            "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png")
                        tileSet.setMaxZoom(19f)
                        tileSet.setMinZoom(0f)
                        val basemapSource = RasterSource("carto-basemap", tileSet, 256)
                        val basemapLayer  = RasterLayer("carto-basemap-layer", "carto-basemap")

                        map.setStyle(
                            Style.Builder()
                                .fromJson(baseStyleJson)
                                .withSource(basemapSource)
                                .withLayer(basemapLayer),
                        ) { style ->
                            setupSources(style)
                            setupLayers(style)
                            styleReady.value = true
                            // OnCameraIdleListener doesn't fire for the initial resting
                            // position — trigger the first viewport fetch manually.
                            val b = map.projection.visibleRegion.latLngBounds
                            vm.onMapIdle(
                                north = b.getLatNorth(),
                                south = b.getLatSouth(),
                                east  = b.getLonEast(),
                                west  = b.getLonWest(),
                                zoom  = map.cameraPosition.zoom,
                            )
                        }

                        map.addOnCameraIdleListener {
                            val bounds = map.projection.visibleRegion.latLngBounds
                            cameraCenter.value = map.cameraPosition.target
                            vm.onMapIdle(
                                north = bounds.getLatNorth(),
                                south = bounds.getLatSouth(),
                                east  = bounds.getLonEast(),
                                west  = bounds.getLonWest(),
                                zoom  = map.cameraPosition.zoom,
                            )
                        }

                        map.addOnMapClickListener { latLng ->
                            val screen   = map.projection.toScreenLocation(latLng)
                            val features = map.queryRenderedFeatures(
                                screen,
                                LYR_CLIMBED,
                                LYR_UNCLIMBED_SINGLE,
                                LYR_UNCLIMBED_CLUSTER,
                            )
                            val peakId = features.firstOrNull()?.getStringProperty("id")
                            if (peakId != null) {
                                vm.onPeakSelectedById(peakId)
                            } else {
                                vm.onSelectionDismissed()
                            }
                            peakId != null
                        }
                    }
                }
            },
            modifier = Modifier.fillMaxSize(),
        )

        // ── MapView lifecycle ─────────────────────────────────────────────────
        // ON_START / ON_RESUME are handled in factory (first mount).
        // This observer handles app going to background and returning,
        // plus the mandatory onPause / onStop / onDestroy cleanup.
        DisposableEffect(lifecycleOwner) {
            val observer = LifecycleEventObserver { _, event ->
                val mv = mapViewRef.value ?: return@LifecycleEventObserver
                when (event) {
                    Lifecycle.Event.ON_START   -> mv.onStart()
                    Lifecycle.Event.ON_RESUME  -> mv.onResume()
                    Lifecycle.Event.ON_PAUSE   -> mv.onPause()
                    Lifecycle.Event.ON_STOP    -> mv.onStop()
                    Lifecycle.Event.ON_DESTROY -> { mv.onStop(); mv.onDestroy() }
                    else                       -> Unit
                }
            }
            lifecycleOwner.lifecycle.addObserver(observer)
            onDispose {
                lifecycleOwner.lifecycle.removeObserver(observer)
                // Proper teardown: onPause → onStop → onDestroy.
                // onDispose fires while the Activity is still RESUMED (tab navigation),
                // so the lifecycle observer never receives ON_PAUSE/ON_STOP — call
                // them explicitly here to flush the GL queue cleanly.
                mapViewRef.value?.let { mv ->
                    runCatching { mv.onPause() }
                    runCatching { mv.onStop() }
                    runCatching { mv.onDestroy() }
                }
            }
        }

        // ── Update GeoJSON sources when peaks / filter change ─────────────────
        val climbed           = uiState.climbedByPeakId
        val viewport          = uiState.peaksCache.values.toList()
        val filter            = uiState.filter
        val rarities          = uiState.rarities
        val selectedRarityIds = uiState.selectedRarityIds

        LaunchedEffect(styleReady.value, climbed, viewport, filter, selectedRarityIds, rarities) {
            if (!styleReady.value) return@LaunchedEffect
            val style = mapRef.value?.style ?: return@LaunchedEffect
            updateMapSources(style, climbed, viewport, filter, selectedRarityIds, rarities)
        }

        // ── Load photo markers async (incremental) ───────────────────────────
        LaunchedEffect(styleReady.value, climbed, rarities) {
            if (!styleReady.value) return@LaunchedEffect
            val map = mapRef.value ?: return@LaunchedEffect
            // When rarities first load, force a full reload so ring colours are correct
            if (rarities.isNotEmpty() && !loadedWithRarities.value) {
                loadedMarkerIds.clear()
                loadedWithRarities.value = true
            }
            loadPhotoMarkers(context, map, climbed, rarities, loadedMarkerIds, cameraCenter.value)
        }

        // ── Toggle satellite / terrain basemap ───────────────────────────────
        LaunchedEffect(styleReady.value, mapType) {
            if (!styleReady.value) return@LaunchedEffect
            val style = mapRef.value?.style ?: return@LaunchedEffect
            // Show carto OR satellite (mutually exclusive basemaps)
            style.getLayer("carto-basemap-layer")
                ?.setProperties(visibility(if (mapType == MapType.SATELLITE) NONE else VISIBLE))
            style.getLayer(LYR_SATELLITE)
                ?.setProperties(visibility(if (mapType == MapType.SATELLITE) VISIBLE else NONE))
            // Hillshade: only for TERRAIN. SATELLITE = pure imagery (hillshade darkens it).
            style.getLayer(LYR_HILLSHADE)
                ?.setProperties(visibility(if (mapType == MapType.TERRAIN) VISIBLE else NONE))
        }

        // ── Toggle trails overlay ─────────────────────────────────────────────
        LaunchedEffect(styleReady.value, trails) {
            if (!styleReady.value) return@LaunchedEffect
            mapRef.value?.style?.getLayer(LYR_TRAILS)
                ?.setProperties(visibility(if (trails) VISIBLE else NONE))
        }

        // ── 3D camera tilt ────────────────────────────────────────────────────
        LaunchedEffect(terrain3d) {
            val map = mapRef.value ?: return@LaunchedEffect
            map.animateCamera(
                CameraUpdateFactory.tiltTo(if (terrain3d) 70.0 else 0.0), 600,
            )
        }

        // ── Fly to peak when selected via search ──────────────────────────────
        val selected = uiState.selected
        LaunchedEffect(selected) {
            if (selected == null || uiState.isSearchActive) return@LaunchedEffect
            mapRef.value?.animateCamera(
                CameraUpdateFactory.newLatLngZoom(
                    LatLng(selected.peak.latitude, selected.peak.longitude), 13.0,
                ), 600,
            )
        }

        // ── Initial camera position (most recent ascent → Barcelona fallback) ─
        LaunchedEffect(styleReady.value, uiState.isLoadingAscents) {
            if (!styleReady.value || hasInitialFlown.value || uiState.isLoadingAscents) return@LaunchedEffect
            val map = mapRef.value ?: return@LaunchedEffect
            hasInitialFlown.value = true
            if (climbed.isNotEmpty()) {
                val mostRecent = climbed.values.maxByOrNull { it.date } ?: return@LaunchedEffect
                map.animateCamera(
                    CameraUpdateFactory.newLatLngZoom(
                        LatLng(mostRecent.peak.latitude, mostRecent.peak.longitude), 9.0,
                    ), 800,
                )
            } else {
                // No ascents — default to Barcelona / Pyrenees
                map.animateCamera(
                    CameraUpdateFactory.newLatLngZoom(LatLng(41.3851, 2.1734), 8.0), 800,
                )
            }
        }

        // ── Glow pulse ring on selected peak ──────────────────────────────────
        // ValueAnimator (Choreographer-driven, same vsync as GL rendering) is more
        // reliable than a coroutine delay loop for MapLibre layer property animation.
        DisposableEffect(selected, styleReady.value) {
            if (!styleReady.value) return@DisposableEffect onDispose {}
            val map   = mapRef.value ?: return@DisposableEffect onDispose {}
            val style = map.style ?: return@DisposableEffect onDispose {}
            val glow  = style.getLayer(LYR_SELECTED_GLOW) ?: return@DisposableEffect onDispose {}
            val src   = style.getSourceAs<GeoJsonSource>(SRC_SELECTED) ?: return@DisposableEffect onDispose {}

            if (selected == null) {
                glow.setProperties(visibility(NONE))
                return@DisposableEffect onDispose {}
            }

            src.setGeoJson(Feature.fromGeometry(
                Point.fromLngLat(selected.peak.longitude, selected.peak.latitude)
            ))
            glow.setProperties(visibility(VISIBLE))

            val animator = ValueAnimator.ofFloat(0f, 1f).apply {
                duration       = 1600
                repeatCount    = ValueAnimator.INFINITE
                interpolator   = DecelerateInterpolator()
                addUpdateListener { anim ->
                    val t      = anim.animatedValue as Float
                    val radius = 22f + t * 30f        // 22 → 52 dp
                    val alpha  = (1f - t) * 0.45f    // fade out
                    glow.setProperties(circleRadius(radius), circleOpacity(alpha))
                }
            }
            animator.start()

            onDispose { animator.cancel() }
        }

        // ── Search bar + Filtros button ───────────────────────────────────────
        if (showTopBar) {
            val hasActiveFilters = uiState.filter != AtlasFilter.ALL ||
                    uiState.selectedRarityIds.isNotEmpty() ||
                    uiState.sortMode != SortMode.DISTANCE
            SearchBarOverlay(
                query            = uiState.searchQuery,
                isActive         = uiState.isSearchActive,
                onQuery          = vm::onSearchQueryChanged,
                onDismiss        = vm::onSearchDismissed,
                filtersOpen      = filtersOpen,
                hasActiveFilters = hasActiveFilters,
                onToggleFilters  = { filtersOpen = !filtersOpen },
                modifier         = Modifier
                    .align(Alignment.TopCenter)
                    .padding(horizontal = 12.dp, vertical = 8.dp),
            )
        }

        // ── Search results list ───────────────────────────────────────────────
        AnimatedVisibility(
            visible  = uiState.isSearchActive && (uiState.searchResults.isNotEmpty() || uiState.placeResults.isNotEmpty()),
            enter    = slideInVertically(),
            exit     = slideOutVertically(),
            modifier = Modifier.align(Alignment.TopCenter),
        ) {
            SearchResultsList(
                results        = uiState.searchResults,
                placeResults   = uiState.placeResults,
                climbedPeakIds = climbed.keys,
                onResultClick  = { peak ->
                    vm.onSearchResultSelected(peak)
                    mapRef.value?.animateCamera(
                        CameraUpdateFactory.newLatLngZoom(
                            LatLng(peak.latitude, peak.longitude), 13.0,
                        ), 600,
                    )
                },
                onPlaceClick   = { place ->
                    vm.onPlaceSelected()
                    mapRef.value?.animateCamera(
                        CameraUpdateFactory.newLatLngZoom(
                            LatLng(place.lat, place.lon), 12.0,
                        ), 600,
                    )
                },
                modifier = Modifier.padding(top = 120.dp),
            )
        }

        // ── Loading spinner ───────────────────────────────────────────────────
        if (uiState.isLoadingAscents) {
            CircularProgressIndicator(
                modifier = Modifier.align(Alignment.Center),
                color    = PeakBlueActive,
            )
        }

        // ── Map control buttons (bottom-right) ────────────────────────────────
        if (!uiState.showList) {
            MapControlsColumn(
                showTopBar     = showTopBar,
                onToggleTopBar = { showTopBar = !showTopBar },
                hasActiveLayers= mapType != MapType.NORMAL || trails,
                layersOpen     = layersOpen,
                onToggleLayers = { layersOpen = !layersOpen },
                terrain3d      = terrain3d,
                onToggle3D     = { terrain3d = !terrain3d },
                geoLocating    = geoLocating,
                onGeolocate    = ::handleGeolocate,
                modifier       = Modifier
                    .align(Alignment.BottomEnd)
                    .navigationBarsPadding()
                    .padding(end = 12.dp, bottom = 72.dp),
            )
        }

        // ── Lista panel (full-screen overlay on the map) ──────────────────────
        if (uiState.showList) {
            PeaksListPanel(
                climbed           = climbed,
                listPeaks         = uiState.listPeaks,
                isLoadingList     = uiState.isLoadingList,
                filter            = filter,
                center            = cameraCenter.value,
                selectedRarityIds = selectedRarityIds,
                sortMode          = uiState.sortMode,
                rarities          = rarities,
                onPeakClick       = { peak ->
                    vm.onPeakSelected(peak)   // full object — never fails silently
                    vm.onToggleList()
                    mapRef.value?.animateCamera(
                        CameraUpdateFactory.newLatLngZoom(
                            LatLng(peak.latitude, peak.longitude), 13.0,
                        ), 600,
                    )
                },
            )
        }

        // ── Lista / Mapa toggle button (bottom-center) ────────────────────────
        // Must be AFTER PeaksListPanel in the Box so it renders on top of the list
        ListaMapaButton(
            showList = uiState.showList,
            onToggle = {
                val c = cameraCenter.value
                vm.onToggleList(c?.latitude, c?.longitude)
            },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = 16.dp),
        )

        // ── Layers panel (bottom sheet) ───────────────────────────────────────
        if (layersOpen) {
            LayersPanel(
                mapType   = mapType,
                onMapType = { mapType = it },
                trails    = trails,
                onTrails  = { trails = it },
                onDismiss = { layersOpen = false },
            )
        }

        // ── Filters panel (bottom sheet) ──────────────────────────────────────
        if (filtersOpen) {
            val isDirty = uiState.filter != AtlasFilter.ALL ||
                          uiState.selectedRarityIds.isNotEmpty() ||
                          uiState.sortMode != SortMode.DISTANCE
            FiltersPanel(
                rarities              = rarities,
                climbed               = climbed,
                viewport              = viewport,
                filter                = filter,
                onFilterChanged       = vm::onFilterChanged,
                selectedRarityIds     = selectedRarityIds,
                onRarityFilterChanged = vm::onRarityFilterChanged,
                sortMode              = uiState.sortMode,
                onSortModeChanged     = vm::onSortModeChanged,
                isDirty               = isDirty,
                onClearFilters        = vm::clearFilters,
                onDismiss             = { filtersOpen = false },
            )
        }

        // ── Atlas onboarding sheet ────────────────────────────────────────────
        if (showOnboarding) {
            MapOnboardingSheet(
                onDismiss  = { showOnboarding = false },
                onDontShow = {
                    prefs.edit().putBoolean("map_onboarding_seen", true).apply()
                    showOnboarding = false
                },
            )
        }

        // ── Peak detail bottom sheet ──────────────────────────────────────────
        if (selected != null) {
            PeakDetailSheet(
                selected              = selected,
                rarities              = rarities,
                onNavigateToCards   = onNavigateToCards,
                onNavigateToNewAscent = onNavigateToNewAscent,
                onDismiss             = vm::onSelectionDismissed,
            )
        }
    }
}

// ── Map source / layer setup ──────────────────────────────────────────────────

private fun setupSources(style: org.maplibre.android.maps.Style) {
    // ESRI World Imagery satellite tiles — no API key required.
    // Path order is {z}/{y}/{x} (row then col) which MapLibre substitutes correctly.
    val satTileSet = TileSet("2.2.0",
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}")
    satTileSet.setMaxZoom(19f)
    style.addSource(RasterSource(SRC_SATELLITE, satTileSet, 256))

    // terrain-dem source is declared in baseStyleJson (needed there for the
    // terrain property to resolve at style-load time). Do not re-add here.

    // Hiking trails overlay (WaymarkedTrails)
    val trailsTileSet = TileSet("2.2.0",
        "https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png")
    trailsTileSet.setMaxZoom(17f)
    style.addSource(RasterSource(SRC_TRAILS, trailsTileSet, 256))

    // Peak data sources
    style.addSource(GeoJsonSource(SRC_CLIMBED, FeatureCollection.fromFeatures(emptyList<Feature>())))
    style.addSource(GeoJsonSource(SRC_SELECTED, FeatureCollection.fromFeatures(emptyList<Feature>())))
    style.addSource(GeoJsonSource(SRC_UNCLIMBED, FeatureCollection.fromFeatures(emptyList<Feature>())))
    style.addSource(
        GeoJsonSource(
            SRC_UNCLIMBED_CLUSTERED,
            FeatureCollection.fromFeatures(emptyList<Feature>()),
            GeoJsonOptions()
                .withCluster(true)
                .withClusterMaxZoom(9)
                .withClusterRadius(42),
        ),
    )
}

private fun setupLayers(style: org.maplibre.android.maps.Style) {
    // Satellite basemap — sits above the Carto raster, initially hidden.
    // Visibility toggled by LaunchedEffect(mapType); hillshade renders on top.
    style.addLayer(
        RasterLayer(LYR_SATELLITE, SRC_SATELLITE)
            .withProperties(
                rasterOpacity(1.0f),
                visibility(NONE),
            ),
    )

    // Hillshade — initially hidden, toggled by the Capas panel
    style.addLayer(
        HillshadeLayer(LYR_HILLSHADE, SRC_TERRAIN_DEM)
            .withProperties(
                hillshadeExaggeration(0.7f),
                hillshadeHighlightColor("rgba(255,255,255,0.4)"),
                hillshadeShadowColor("rgba(0,0,0,0.5)"),
                visibility(NONE),
            ),
    )
    // Hiking trails overlay — initially hidden
    style.addLayer(
        RasterLayer(LYR_TRAILS, SRC_TRAILS)
            .withProperties(
                rasterOpacity(0.75f),
                visibility(NONE),
            ),
    )

    // Clustered groups of unclimbed peaks
    style.addLayer(
        CircleLayer(LYR_UNCLIMBED_CLUSTER, SRC_UNCLIMBED_CLUSTERED)
            .withFilter(has("point_count"))
            .withProperties(
                circleRadius(
                    step(
                        toNumber(get("point_count")),
                        literal(18),
                        stop(10, 22),
                        stop(50, 26),
                    ),
                ),
                circleColor(UNCLIMBED_COLOR),
                circleOpacity(0.85f),
                circleStrokeWidth(2f),
                circleStrokeColor("#FFFFFF"),
            ),
    )
    // Individual unclimbed peaks — colored by rarity via GeoJSON property
    style.addLayer(
        CircleLayer(LYR_UNCLIMBED_SINGLE, SRC_UNCLIMBED)
            .withFilter(not(has("point_count")))
            .withProperties(
                circleRadius(7f),
                circleColor(get("rarityColor")),
                circleOpacity(0.85f),
                circleStrokeWidth(1.5f),
                circleStrokeColor("#FFFFFF"),
            )
            .also { it.setMinZoom(9.0f) },
    )
    // Peak labels appear once the map is close enough for real discovery.
    style.addLayer(
        SymbolLayer(LYR_UNCLIMBED_LABELS, SRC_UNCLIMBED)
            .withFilter(not(has("point_count")))
            .withProperties(
                textField("{name}"),
                textSize(11f),
                textOffset(arrayOf(0f, 1.15f)),
                textAnchor("top"),
                textColor("#374151"),
                textHaloColor("rgba(255,255,255,0.92)"),
                textHaloWidth(1.5f),
                textIgnorePlacement(false),
                textAllowOverlap(false),
            )
            .also { it.setMinZoom(10.5f) },
    )
    // Cluster count labels
    style.addLayer(
        SymbolLayer(LYR_CLUSTER_COUNT, SRC_UNCLIMBED_CLUSTERED)
            .withFilter(has("point_count"))
            .withProperties(
                textField("{point_count_abbreviated}"),
                textSize(12f),
                textColor("#FFFFFF"),
                textIgnorePlacement(true),
                textAllowOverlap(true),
            ),
    )
    // Climbed peaks — photo icons loaded async, SymbolLayer renders them
    style.addLayer(
        SymbolLayer(LYR_CLIMBED, SRC_CLIMBED)
            .withProperties(
                iconImage(get("iconImage")),
                iconSize(1.0f),
                iconAllowOverlap(true),
                iconIgnorePlacement(true),
            ),
    )
    // Glow ring for the currently selected peak — animated via LaunchedEffect, rendered on top
    style.addLayer(
        CircleLayer(LYR_SELECTED_GLOW, SRC_SELECTED)
            .withProperties(
                circleRadius(22f),
                circleColor("#FBBF24"),   // amber-400, matches web peakPulse keyframe
                circleOpacity(0f),
                visibility(NONE),
            ),
    )
}

// ── Update GeoJSON sources ────────────────────────────────────────────────────

private fun updateMapSources(
    style: org.maplibre.android.maps.Style,
    climbed: Map<String, MapAscent>,
    viewport: List<Peak>,
    filter: AtlasFilter,
    selectedRarityIds: Set<String>,
    rarities: List<Rarity>,
) {
    val rarityColorMap = rarities.associateBy { it.id }

    val climbedFeatures: List<Feature> = if (filter != AtlasFilter.NOT_YET) {
        climbed.values
            .filter { selectedRarityIds.isEmpty() || it.peak.rarityId in selectedRarityIds }
            .map { ascent ->
                Feature.fromGeometry(
                    Point.fromLngLat(ascent.peak.longitude, ascent.peak.latitude),
                ).apply {
                    addStringProperty("id",        ascent.peakId)
                    addStringProperty("name",      ascent.peak.name)
                    addNumberProperty("altitudeM", ascent.peak.altitudeM)
                    addStringProperty("iconImage", "peak-photo-${ascent.peakId}")
                }
            }
    } else emptyList()

    style.getSourceAs<GeoJsonSource>(SRC_CLIMBED)
        ?.setGeoJson(FeatureCollection.fromFeatures(climbedFeatures))

    val unclimbedFeatures: List<Feature> = if (filter != AtlasFilter.CLIMBED) {
        viewport
            .filter { it.id !in climbed }
            .filter { selectedRarityIds.isEmpty() || it.rarityId in selectedRarityIds }
            .map { peak ->
                val rarityColor = peak.rarityId?.let { rarityColorMap[it]?.color } ?: UNCLIMBED_COLOR
                Feature.fromGeometry(
                    Point.fromLngLat(peak.longitude, peak.latitude),
                ).apply {
                    addStringProperty("id",          peak.id)
                    addStringProperty("name",        peak.name)
                    addNumberProperty("altitudeM",   peak.altitudeM)
                    addStringProperty("rarityColor", rarityColor)
                }
            }
    } else emptyList()

    style.getSourceAs<GeoJsonSource>(SRC_UNCLIMBED)
        ?.setGeoJson(FeatureCollection.fromFeatures(unclimbedFeatures))
    style.getSourceAs<GeoJsonSource>(SRC_UNCLIMBED_CLUSTERED)
        ?.setGeoJson(FeatureCollection.fromFeatures(unclimbedFeatures))

    val showClimbed   = if (filter != AtlasFilter.NOT_YET) VISIBLE else NONE
    val showUnclimbed = if (filter != AtlasFilter.CLIMBED) VISIBLE else NONE

    style.getLayer(LYR_CLIMBED)?.setProperties(visibility(showClimbed))
    style.getLayer(LYR_UNCLIMBED_SINGLE)?.setProperties(visibility(showUnclimbed))
    style.getLayer(LYR_UNCLIMBED_LABELS)?.setProperties(visibility(showUnclimbed))
    style.getLayer(LYR_UNCLIMBED_CLUSTER)?.setProperties(visibility(showUnclimbed))
    style.getLayer(LYR_CLUSTER_COUNT)?.setProperties(visibility(showUnclimbed))
}

// ── Photo marker loading ──────────────────────────────────────────────────────

private suspend fun loadPhotoMarkers(
    context: android.content.Context,
    map: MapLibreMap,
    climbed: Map<String, MapAscent>,
    rarities: List<Rarity>,
    loadedMarkerIds: MutableSet<String>,
    center: LatLng?,
) {
    val rarityColorMap = rarities.associateBy { it.id }
    val imageLoader    = context.imageLoader

    // Pre-filter synchronously before launching any coroutines — eliminates
    // the concurrent-check race entirely since no coroutine is running yet.
    // Sort by distance from the current viewport center so visible peaks
    // get their markers first and appear on screen as quickly as possible.
    val toLoad = climbed.entries
        .filter { (peakId, _) -> peakId !in loadedMarkerIds }
        .sortedBy { (_, ascent) ->
            if (center != null)
                haversineKm(center.latitude, center.longitude, ascent.peak.latitude, ascent.peak.longitude)
            else
                0.0
        }

    if (toLoad.isEmpty()) return

    // 5 concurrent downloads: fast enough to saturate a mobile connection,
    // low enough to avoid hammering the CDN or blocking the network queue.
    val semaphore = Semaphore(5)
    coroutineScope {
        for ((peakId, ascent) in toLoad) {
            launch {
                semaphore.withPermit {
                    val ringColor = ascent.peak.rarityId
                        ?.let { rarityColorMap[it]?.color }
                        ?: DEFAULT_RARITY_COLOR

                    val markerBitmap: Bitmap = if (ascent.photoUrl != null) {
                        try {
                            val result = imageLoader.execute(
                                ImageRequest.Builder(context)
                                    .data(ascent.photoUrl)
                                    .size(Size(176, 176))
                                    .allowHardware(false)
                                    .build(),
                            )
                            val src = (result.image as? BitmapImage)?.bitmap
                            if (src != null) createCircularMarkerBitmap(src, ringColor, sizePx = 88)
                            else             createFallbackMarkerBitmap(ringColor, sizePx = 88)
                        } catch (_: Exception) {
                            createFallbackMarkerBitmap(ringColor, sizePx = 88)
                        }
                    } else {
                        createFallbackMarkerBitmap(ringColor, sizePx = 48)
                    }

                    // Both addImage and loadedMarkerIds.add run on the Main thread
                    // — serialised, no concurrent mutation of either resource.
                    withContext(Dispatchers.Main) {
                        map.style?.addImage("peak-photo-$peakId", markerBitmap, false)
                        loadedMarkerIds.add(peakId)
                    }
                }
            }
        }
    }
}

// Clips a photo to a circle and draws a rarity-coloured ring around it.
private fun createCircularMarkerBitmap(source: Bitmap, ringColorHex: String, sizePx: Int): Bitmap {
    val output = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(output)
    val paint  = Paint(Paint.ANTI_ALIAS_FLAG)
    val cx     = sizePx / 2f
    val ringW  = sizePx * 0.07f
    val photoR = cx - ringW - 1f

    // Photo clipped to circle
    val scaled = Bitmap.createScaledBitmap(source, sizePx, sizePx, true)
    paint.shader = BitmapShader(scaled, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP)
    canvas.drawCircle(cx, cx, photoR, paint)

    // Rarity-coloured ring
    paint.shader      = null
    paint.style       = Paint.Style.STROKE
    paint.strokeWidth = ringW
    paint.color = try { Color.parseColor(ringColorHex) }
                  catch (_: Exception) { Color.parseColor(DEFAULT_RARITY_COLOR) }
    canvas.drawCircle(cx, cx, cx - ringW / 2f, paint)

    return output
}

// Coloured ring dot — used for climbed peaks that have no photo yet.
private fun createFallbackMarkerBitmap(ringColorHex: String, sizePx: Int): Bitmap {
    val output = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(output)
    val paint  = Paint(Paint.ANTI_ALIAS_FLAG)
    val cx     = sizePx / 2f
    val ringW  = sizePx * 0.12f

    // White filled circle
    paint.style = Paint.Style.FILL
    paint.color = Color.WHITE
    canvas.drawCircle(cx, cx, cx - ringW - 1f, paint)

    // Coloured ring
    paint.style       = Paint.Style.STROKE
    paint.strokeWidth = ringW
    paint.color = try { Color.parseColor(ringColorHex) }
                  catch (_: Exception) { Color.parseColor(DEFAULT_RARITY_COLOR) }
    canvas.drawCircle(cx, cx, cx - ringW / 2f, paint)

    return output
}

// ── Search bar overlay ────────────────────────────────────────────────────────

@Composable
private fun SearchBarOverlay(
    query: String,
    isActive: Boolean,
    onQuery: (String) -> Unit,
    onDismiss: () -> Unit,
    filtersOpen: Boolean,
    hasActiveFilters: Boolean,
    onToggleFilters: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier              = modifier.fillMaxWidth(),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        com.peakadex.app.core.ui.PeakSearchField(
            value         = query,
            onValueChange = onQuery,
            placeholder   = stringResource(R.string.atlas_search_placeholder),
            modifier      = Modifier.weight(1f),
            showClear     = isActive,
            onClear       = onDismiss,
        )
        com.peakadex.app.core.ui.PeakFilterButton(
            label     = stringResource(R.string.atlas_btn_filters),
            active    = filtersOpen || hasActiveFilters,
            showBadge = hasActiveFilters && !filtersOpen,
            onClick   = onToggleFilters,
        )
    }
}

// ── Search results ────────────────────────────────────────────────────────────

@Composable
private fun SearchResultsList(
    results: List<Peak>,
    placeResults: List<com.peakadex.app.core.model.GeocodedPlace>,
    climbedPeakIds: Set<String>,
    onResultClick: (Peak) -> Unit,
    onPlaceClick: (com.peakadex.app.core.model.GeocodedPlace) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp)
            .shadow(6.dp, RoundedCornerShape(16.dp))
            .background(androidx.compose.ui.graphics.Color.White, RoundedCornerShape(16.dp))
            .padding(vertical = 4.dp),
    ) {
        // ── Picos ──────────────────────────────────────────────────────────
        items(results) { peak ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onResultClick(peak) }
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(
                            if (peak.id in climbedPeakIds) PeakClimbedGreen else PeakUnclimbedBlue,
                            CircleShape,
                        ),
                )
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(peak.name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    val sub = listOfNotNull(peak.mountainRange, "${peak.altitudeM} m").joinToString(" · ")
                    if (sub.isNotEmpty()) {
                        Text(sub, fontSize = 12.sp, color = PeakMuted)
                    }
                }
            }
            HorizontalDivider(thickness = 0.5.dp, color = PeakBorderLight)
        }

        // ── Lugares (Nominatim) ────────────────────────────────────────────
        if (placeResults.isNotEmpty()) {
            if (results.isNotEmpty()) {
                item {
                    Text(
                        text     = stringResource(R.string.atlas_section_places),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color    = PeakMuted,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 6.dp),
                    )
                    HorizontalDivider(thickness = 0.5.dp, color = PeakBorderLight)
                }
            }
            items(placeResults) { place ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onPlaceClick(place) }
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("📍", fontSize = 14.sp)
                    Spacer(Modifier.width(12.dp))
                    Text(
                        text     = place.name,
                        fontSize = 14.sp,
                        color    = PeakTextHeadline,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                }
                HorizontalDivider(thickness = 0.5.dp, color = PeakBorderLight)
            }
        }
    }
}

// ── Peak detail bottom sheet ──────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PeakDetailSheet(
    selected: SelectedPeakUi,
    rarities: List<Rarity>,
    onNavigateToCards: (peakId: String, peakName: String) -> Unit,
    onNavigateToNewAscent: (peakId: String, peakName: String) -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val peak   = selected.peak
    val ascent = selected.ascent
    val rarity = peak.rarityId?.let { id -> rarities.find { it.id == id } }
    val rarityColor = rarity?.let {
        runCatching {
            androidx.compose.ui.graphics.Color(android.graphics.Color.parseColor(it.color))
        }.getOrNull()
    }
    val rarityColorDark = rarity?.let {
        runCatching {
            androidx.compose.ui.graphics.Color(android.graphics.Color.parseColor(it.colorDark))
        }.getOrElse { PeakTextHeadline }
    }

    // containerColor = rarity color so the Sheet's own Surface background fills
    // the rounded top corners perfectly (a child Box can never reach those pixels).
    // The content Column immediately covers with white, leaving only the dragHandle
    // zone visible as the accent band.
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState       = sheetState,
        // containerColor is always white so the bottom nav-bar area never shows
        // the rarity colour. The dragHandle box draws the rarity band explicitly;
        // it is clipped by the sheet's shape, giving it the correct rounded corners.
        containerColor   = androidx.compose.ui.graphics.Color.White,
        shape            = RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp),
        dragHandle = {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(7.dp)
                    .background(rarityColor ?: androidx.compose.ui.graphics.Color.Transparent),
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    modifier = Modifier
                        .width(32.dp)
                        .height(3.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(
                            if (rarityColor != null)
                                androidx.compose.ui.graphics.Color.White.copy(alpha = 0.6f)
                            else
                                PeakBorderLight,
                        ),
                )
            }
        },
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(androidx.compose.ui.graphics.Color.White)
                .navigationBarsPadding()
                .padding(bottom = 20.dp),
        ) {

            // ── Header: name + altitude / comarca / rarity badge ─────────────
            Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp)) {
                // Name + altitude
                Row(
                    modifier              = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment     = Alignment.Top,
                ) {
                    Text(
                        text       = peak.name,
                        fontSize   = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color      = PeakTextHeadline,
                        modifier   = Modifier.weight(1f),
                        maxLines   = 2,
                        overflow   = TextOverflow.Ellipsis,
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text       = "${peak.altitudeM} m",
                        fontSize   = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color      = PeakMuted,
                    )
                }
                // Comarca / mountain range — own line below name
                if (!peak.mountainRange.isNullOrBlank()) {
                    Text(
                        text     = peak.mountainRange,
                        fontSize = 12.sp,
                        color    = PeakSubtle,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
                // Rarity badge — right-aligned
                if (rarity != null && rarityColor != null && rarityColorDark != null) {
                    Row(
                        modifier              = Modifier.fillMaxWidth().padding(top = 4.dp),
                        horizontalArrangement = Arrangement.End,
                    ) {
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(99.dp))
                                .background(rarityColor.copy(alpha = 0.13f))
                                .padding(horizontal = 7.dp, vertical = 2.dp),
                            verticalAlignment     = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(3.dp),
                        ) {
                            Text("✿", fontSize = 10.sp, color = rarityColor)
                            Text(
                                text       = rarity.label,
                                fontSize   = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color      = rarityColorDark,
                            )
                        }
                    }
                }
            }

            // ── Hero photo — full width, 3:2 ratio (matches web popup) ────────
            if (ascent?.photoUrl != null) {
                coil3.compose.AsyncImage(
                    model              = ascent.photoUrl,
                    contentDescription = peak.name,
                    contentScale       = ContentScale.Crop,
                    modifier           = Modifier
                        .fillMaxWidth()
                        .aspectRatio(3f / 2f),
                )
            }

            HorizontalDivider(color = PeakBorderLight)

            // ── Action buttons ────────────────────────────────────────────────
            Row(
                modifier              = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (ascent != null) {
                    // Climbed: "Ver capturas" (ghost) + "Capturar" (dark)
                    OutlinedButton(
                        onClick  = { onDismiss(); onNavigateToCards(peak.id, peak.name) },
                        modifier = Modifier.weight(1f).height(40.dp),
                        shape    = RoundedCornerShape(10.dp),
                        border   = BorderStroke(1.dp, PeakSlate),
                        colors   = ButtonDefaults.outlinedButtonColors(contentColor = PeakSlate),
                    ) {
                        Text(stringResource(R.string.atlas_btn_view_ascents), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                    Button(
                        onClick  = { onDismiss(); onNavigateToNewAscent(peak.id, peak.name) },
                        modifier = Modifier.weight(1f).height(40.dp),
                        shape    = RoundedCornerShape(10.dp),
                        colors   = ButtonDefaults.buttonColors(containerColor = PeakSlate),
                    ) {
                        Text(stringResource(R.string.atlas_btn_capture), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                } else {
                    // Unclimbed: single full-width "Capturar" button
                    Button(
                        onClick  = { onDismiss(); onNavigateToNewAscent(peak.id, peak.name) },
                        modifier = Modifier.fillMaxWidth().height(40.dp),
                        shape    = RoundedCornerShape(10.dp),
                        colors   = ButtonDefaults.buttonColors(containerColor = PeakSlate),
                    ) {
                        Text(stringResource(R.string.atlas_btn_capture), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
private fun MetaChip(label: String, value: String) {
    Column {
        Text(label, fontSize = 11.sp, color = PeakSubtle)
        Text(value, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
            maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

// ── Geolocation helper ────────────────────────────────────────────────────────

@SuppressLint("MissingPermission")
private fun geoLocateNow(
    context: android.content.Context,
    map: MapLibreMap?,
    onDone: () -> Unit = {},
) {
    val lm = context.getSystemService(android.content.Context.LOCATION_SERVICE) as LocationManager
    val loc = runCatching {
        lm.getLastKnownLocation(LocationManager.GPS_PROVIDER)
            ?: lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
            ?: lm.getLastKnownLocation(LocationManager.PASSIVE_PROVIDER)
    }.getOrNull()

    if (loc != null) {
        map?.animateCamera(
            CameraUpdateFactory.newLatLngZoom(LatLng(loc.latitude, loc.longitude), 14.0), 800,
        )
        onDone()
        return
    }

    // No cached location — request a single fresh fix
    val provider = when {
        lm.isProviderEnabled(LocationManager.GPS_PROVIDER)     -> LocationManager.GPS_PROVIDER
        lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER) -> LocationManager.NETWORK_PROVIDER
        else -> { onDone(); return }
    }

    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
        // API 30+: getCurrentLocation replaces the deprecated requestSingleUpdate
        runCatching {
            lm.getCurrentLocation(
                provider,
                null,
                ContextCompat.getMainExecutor(context),
            ) { location ->
                if (location != null) {
                    map?.animateCamera(
                        CameraUpdateFactory.newLatLngZoom(
                            LatLng(location.latitude, location.longitude), 14.0,
                        ), 800,
                    )
                }
                onDone()
            }
        }.onFailure { onDone() }
    } else {
        @Suppress("DEPRECATION")
        runCatching {
            lm.requestSingleUpdate(provider, { location ->
                map?.animateCamera(
                    CameraUpdateFactory.newLatLngZoom(
                        LatLng(location.latitude, location.longitude), 14.0,
                    ), 800,
                )
                onDone()
            }, android.os.Looper.getMainLooper())
        }.onFailure { onDone() }
    }
}

// ── Distance helper ───────────────────────────────────────────────────────────

private fun haversineKm(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
    val R = 6371.0
    val dLat = Math.toRadians(lat2 - lat1)
    val dLng = Math.toRadians(lng2 - lng1)
    val a = sin(dLat / 2).pow(2) +
        cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLng / 2).pow(2)
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))
}

// ── Map control buttons (bottom-right column) ─────────────────────────────────

@Composable
private fun MapControlsColumn(
    showTopBar: Boolean,
    onToggleTopBar: () -> Unit,
    hasActiveLayers: Boolean,
    layersOpen: Boolean,
    onToggleLayers: () -> Unit,
    terrain3d: Boolean,
    onToggle3D: () -> Unit,
    geoLocating: Boolean,
    onGeolocate: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        // Search toggle
        MapControlBtn(active = !showTopBar, onClick = onToggleTopBar) {
            Icon(SearchIcon, contentDescription = stringResource(R.string.atlas_action_search),
                tint = if (!showTopBar) androidx.compose.ui.graphics.Color.White else PeakSlate,
                modifier = Modifier.size(18.dp))
        }
        // Layers
        MapControlBtn(active = layersOpen || hasActiveLayers, onClick = onToggleLayers) {
            Icon(LayersIcon, contentDescription = stringResource(R.string.atlas_action_layers),
                tint = if (layersOpen || hasActiveLayers) androidx.compose.ui.graphics.Color.White else PeakSlate,
                modifier = Modifier.size(20.dp))
        }
        // 3D
        MapControlBtn(active = terrain3d, onClick = onToggle3D) {
            Text("3D",
                fontSize = 13.sp, fontWeight = FontWeight.Bold,
                color = if (terrain3d) androidx.compose.ui.graphics.Color.White else PeakSlate)
        }
        // Geolocate
        MapControlBtn(active = false, onClick = onGeolocate) {
            if (geoLocating) {
                CircularProgressIndicator(
                    modifier    = Modifier.size(18.dp),
                    color       = PeakBlueActive,
                    strokeWidth = 2.dp,
                )
            } else {
                Icon(LocationIcon, contentDescription = stringResource(R.string.atlas_action_my_location),
                    tint     = PeakSlate,
                    modifier = Modifier.size(18.dp))
            }
        }
    }
}

@Composable
private fun MapControlBtn(
    active: Boolean,
    onClick: () -> Unit,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(48.dp)
            .shadow(4.dp, CircleShape)
            .background(
                if (active) PeakSlate else androidx.compose.ui.graphics.Color.White,
                CircleShape,
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { content() }
}

// ── Lista / Mapa toggle button ────────────────────────────────────────────────

@Composable
private fun ListaMapaButton(
    showList: Boolean,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .shadow(6.dp, RoundedCornerShape(28.dp))
            .background(
                if (showList) PeakSlate else PeakClimbedGreen,
                RoundedCornerShape(28.dp),
            )
            .clickable(onClick = onToggle)
            .padding(horizontal = 20.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(
            imageVector        = if (showList) MapOutlineIcon else ListIcon,
            contentDescription = null,
            tint               = androidx.compose.ui.graphics.Color.White,
            modifier           = Modifier.size(18.dp),
        )
        Text(
            text       = stringResource(if (showList) R.string.atlas_toggle_map else R.string.atlas_toggle_list),
            color      = androidx.compose.ui.graphics.Color.White,
            fontWeight = FontWeight.Bold,
            fontSize   = 15.sp,
        )
    }
}

// ── Peaks list panel ──────────────────────────────────────────────────────────

@Composable
private fun PeaksListPanel(
    climbed: Map<String, com.peakadex.app.core.model.MapAscent>,
    listPeaks: List<Peak>,
    isLoadingList: Boolean,
    filter: AtlasFilter,
    center: LatLng?,
    selectedRarityIds: Set<String>,
    sortMode: SortMode,
    rarities: List<Rarity>,
    onPeakClick: (Peak) -> Unit,
) {
    val items = remember(climbed, listPeaks, filter, center, selectedRarityIds, sortMode, rarities) {
        val climbedPeaks = if (filter != AtlasFilter.NOT_YET)
            climbed.values.map { it.peak } else emptyList()
        val unclimbedPeaks = if (filter != AtlasFilter.CLIMBED)
            listPeaks.filter { it.id !in climbed } else emptyList()
        val all = (climbedPeaks + unclimbedPeaks)
            .distinctBy { it.id }
            .filter { p -> selectedRarityIds.isEmpty() || p.rarityId in selectedRarityIds }
        val rarityWeights = rarities.associate { it.id to it.scoreWeight }
        val maxAlt = all.maxOfOrNull { it.altitudeM } ?: 1
        when (sortMode) {
            SortMode.ALTITUDE  -> all.sortedByDescending { it.altitudeM }
            SortMode.DISTANCE  -> if (center != null)
                all.sortedBy { haversineKm(center.latitude, center.longitude, it.latitude, it.longitude) }
                else all.sortedByDescending { it.altitudeM }
            SortMode.RELEVANCE -> {
                all.sortedByDescending { peak ->
                    val distKm = center?.let {
                        haversineKm(it.latitude, it.longitude, peak.latitude, peak.longitude)
                    } ?: 0.0
                    val distScore = 1.0 / (distKm + 0.1)
                    val rw = peak.rarityId?.let { rarityWeights[it] } ?: 0.1
                    val normAlt = if (maxAlt > 0) peak.altitudeM.toDouble() / maxAlt else 0.0
                    distScore * 0.5 + rw * 0.3 + normAlt * 0.2
                }
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(androidx.compose.ui.graphics.Color.White)
            .statusBarsPadding(),
    ) {
        if (isLoadingList) {
            CircularProgressIndicator(
                modifier = Modifier.align(Alignment.Center),
                color    = PeakBlueActive,
            )
        } else if (items.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(stringResource(R.string.atlas_list_empty),
                    fontSize = 14.sp, color = PeakSubtle)
            }
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize()) {
                item {
                    Text(
                        text       = pluralStringResource(R.plurals.atlas_peak_count, items.size, items.size),
                        fontSize   = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color      = PeakMuted,
                        modifier   = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                    )
                }
                items(items) { peak ->
                    val mapAscent = climbed[peak.id]
                    val isClimbed = mapAscent != null
                    val distKm    = center?.let {
                        haversineKm(it.latitude, it.longitude, peak.latitude, peak.longitude)
                    }
                    val rarityColor = peak.rarityId
                        ?.let { id -> rarities.find { it.id == id } }
                        ?.let { r ->
                            runCatching {
                                androidx.compose.ui.graphics.Color(
                                    android.graphics.Color.parseColor(r.color)
                                )
                            }.getOrNull()
                        }
                        ?: PeakClimbedGreen

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onPeakClick(peak) }
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        // Left: photo thumbnail for climbed peaks, small dot for unclimbed
                        Box(
                            modifier           = Modifier.size(44.dp),
                            contentAlignment   = Alignment.Center,
                        ) {
                            if (isClimbed && mapAscent?.photoUrl != null) {
                                coil3.compose.AsyncImage(
                                    model              = mapAscent.photoUrl,
                                    contentDescription = null,
                                    contentScale       = ContentScale.Crop,
                                    modifier           = Modifier
                                        .fillMaxSize()
                                        .clip(RoundedCornerShape(8.dp))
                                        .border(1.5.dp, rarityColor, RoundedCornerShape(8.dp)),
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .size(9.dp)
                                        .background(PeakUnclimbedBlue, CircleShape),
                                )
                            }
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                peak.name,
                                fontWeight = FontWeight.SemiBold,
                                fontSize   = 15.sp,
                                maxLines   = 1,
                                overflow   = TextOverflow.Ellipsis,
                            )
                            val sub = listOfNotNull(peak.mountainRange, peak.country)
                                .joinToString(" · ")
                            if (sub.isNotEmpty()) {
                                Text(
                                    sub,
                                    fontSize = 12.sp,
                                    color    = PeakSubtle,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                "${peak.altitudeM} m",
                                fontSize   = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color      = PeakNavyDark,
                            )
                            if (distKm != null) {
                                val distStr = if (distKm < 1.0) "${(distKm * 1000).toInt()} m"
                                              else "${"%.1f".format(distKm)} km"
                                Text(distStr, fontSize = 11.sp, color = PeakSubtle)
                            }
                        }
                    }
                    HorizontalDivider(thickness = 1.dp, color = PeakBorderLight)
                }
            }
        }
    }
}

// ── Layers panel (bottom sheet) ───────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LayersPanel(
    mapType: MapType,
    onMapType: (MapType) -> Unit,
    trails: Boolean,
    onTrails: (Boolean) -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState       = sheetState,
        containerColor   = androidx.compose.ui.graphics.Color.White,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp)
                .padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Text(stringResource(R.string.atlas_layers_title),
                fontSize = 17.sp, fontWeight = FontWeight.Bold,
                color    = PeakTextHeadline)

            // Map type section — mutually exclusive (Normal / Terrain / Satellite)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(R.string.atlas_layers_map_type),
                    fontSize = 10.sp, fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.sp, color = PeakSubtle)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    LayerCard(
                        label    = stringResource(R.string.atlas_layers_normal),
                        active   = mapType == MapType.NORMAL,
                        onClick  = { onMapType(MapType.NORMAL) },
                        icon     = MapOutlineIcon,
                        modifier = Modifier.weight(1f),
                    )
                    LayerCard(
                        label    = stringResource(R.string.atlas_layers_terrain),
                        active   = mapType == MapType.TERRAIN,
                        onClick  = { onMapType(MapType.TERRAIN) },
                        icon     = TerrainIcon,
                        modifier = Modifier.weight(1f),
                    )
                    LayerCard(
                        label    = stringResource(R.string.atlas_layers_satellite),
                        active   = mapType == MapType.SATELLITE,
                        onClick  = { onMapType(MapType.SATELLITE) },
                        icon     = SatelliteIcon,
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            // Additional layers section
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(R.string.atlas_layers_section),
                    fontSize = 10.sp, fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.sp, color = PeakSubtle)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    LayerCard(
                        label    = stringResource(R.string.atlas_layers_trails),
                        active   = trails,
                        onClick  = { onTrails(!trails) },
                        icon     = TrailsIcon,
                        modifier = Modifier.weight(1f),
                    )
                    Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun LayerCard(
    label: String,
    active: Boolean,
    onClick: () -> Unit,
    icon: ImageVector,
    modifier: Modifier = Modifier,
) {
    val borderColor  = if (active) PeakBlueActive else PeakBorderLight
    val bgColor      = if (active) PeakLayerActiveBg else PeakSurfaceAlt
    val iconBg       = if (active) PeakBlueActive.copy(alpha = 0.1f)
                       else        androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.04f)
    val contentColor = if (active) PeakBlueActive else PeakMuted
    Box(
        modifier = modifier
            .shadow(1.dp, RoundedCornerShape(10.dp))
            .background(bgColor, RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp, horizontal = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            // Checkmark badge
            Box {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(iconBg, RoundedCornerShape(8.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(icon, contentDescription = null,
                        tint = contentColor, modifier = Modifier.size(22.dp))
                }
                if (active) {
                    Box(
                        modifier = Modifier
                            .size(14.dp)
                            .align(Alignment.TopEnd)
                            .background(PeakBlueActive, CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(CheckIcon, contentDescription = null,
                            tint = androidx.compose.ui.graphics.Color.White,
                            modifier = Modifier.size(8.dp))
                    }
                }
            }
            Text(label,
                fontSize   = 11.sp,
                fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
                color      = if (active) PeakBlueActive else PeakOnSurface)
        }
    }
}

// ── Filters panel (bottom sheet) ──────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FiltersPanel(
    rarities: List<Rarity>,
    climbed: Map<String, MapAscent>,
    viewport: List<Peak>,
    filter: AtlasFilter,
    onFilterChanged: (AtlasFilter) -> Unit,
    selectedRarityIds: Set<String>,
    onRarityFilterChanged: (Set<String>) -> Unit,
    sortMode: SortMode,
    onSortModeChanged: (SortMode) -> Unit,
    isDirty: Boolean,
    onClearFilters: () -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    // Rarity pill counts — depends on the active status filter:
    //   CLIMBED  → all user captures globally (personal inventory, not location-dependent)
    //   NOT_YET  → unclimbed peaks in the current viewport cache only
    //   ALL      → all peaks in the current viewport cache (climbed + unclimbed in this area)
    val rarityTotalCounts = remember(climbed, viewport, filter, rarities) {
        val peaks: List<Peak> = when (filter) {
            AtlasFilter.CLIMBED -> climbed.values.map { it.peak }
            AtlasFilter.NOT_YET -> viewport.filter { it.id !in climbed }
            AtlasFilter.ALL     -> viewport
        }
        rarities.associateWith { rarity -> peaks.count { it.rarityId == rarity.id } }
    }

    // Total visible peaks after all active filters
    val filteredCount = remember(climbed, viewport, filter, selectedRarityIds) {
        val climbedPeaks = if (filter != AtlasFilter.NOT_YET)
            climbed.values.map { it.peak } else emptyList()
        val unclimbedPeaks = if (filter != AtlasFilter.CLIMBED)
            viewport.filter { it.id !in climbed } else emptyList()
        (climbedPeaks + unclimbedPeaks)
            .distinctBy { it.id }
            .count { p -> selectedRarityIds.isEmpty() || p.rarityId in selectedRarityIds }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState       = sheetState,
        containerColor   = androidx.compose.ui.graphics.Color.White,
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(top = 10.dp, bottom = 4.dp)
                    .width(36.dp).height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(PeakBorderLight),
            )
        },
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {

            // ── Header ────────────────────────────────────────────────────────
            Row(
                modifier              = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment     = Alignment.CenterVertically,
            ) {
                Text(
                    text       = stringResource(R.string.atlas_btn_filters),
                    fontSize   = 17.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color      = PeakTextHeadline,
                )
                if (isDirty) {
                    TextButton(onClick = onClearFilters) {
                        Text(
                            stringResource(R.string.atlas_clear_filters),
                            fontSize   = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color      = PeakBlueActive,
                        )
                    }
                } else {
                    IconButton(onClick = onDismiss, modifier = Modifier.size(40.dp)) {
                        Icon(
                            imageVector        = CloseIcon,
                            contentDescription = stringResource(R.string.atlas_action_close),
                            tint               = PeakSubtle,
                            modifier           = Modifier.size(18.dp),
                        )
                    }
                }
            }

            HorizontalDivider(color = PeakBorderLight)

            // ── Scrollable body ───────────────────────────────────────────────
            Column(
                modifier = Modifier
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp, vertical = 18.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp),
            ) {

                // ── RAREZA ────────────────────────────────────────────────────
                if (rarities.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text          = stringResource(R.string.atlas_section_rarity),
                            fontSize      = 10.sp,
                            fontWeight    = FontWeight.ExtraBold,
                            letterSpacing = 1.sp,
                            color         = PeakSubtle,
                        )
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement   = Arrangement.spacedBy(8.dp),
                        ) {
                            rarities.forEach { rarity ->
                                RarityPill(
                                    rarity   = rarity,
                                    count    = rarityTotalCounts[rarity] ?: 0,
                                    selected = rarity.id in selectedRarityIds,
                                    onToggle = {
                                        val newSet = selectedRarityIds.toMutableSet()
                                        if (rarity.id in newSet) newSet.remove(rarity.id)
                                        else newSet.add(rarity.id)
                                        onRarityFilterChanged(newSet)
                                    },
                                )
                            }
                        }
                    }
                }

                // ── ESTADO ────────────────────────────────────────────────────
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text          = stringResource(R.string.atlas_section_status),
                        fontSize      = 10.sp,
                        fontWeight    = FontWeight.ExtraBold,
                        letterSpacing = 1.sp,
                        color         = PeakSubtle,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = filter == AtlasFilter.ALL,
                            onClick  = { onFilterChanged(AtlasFilter.ALL) },
                            label    = { Text(stringResource(R.string.atlas_filter_all), fontSize = 13.sp) },
                            colors   = atlasFilterChipColors(),
                            border   = atlasFilterChipBorder(filter == AtlasFilter.ALL),
                        )
                        FilterChip(
                            selected = filter == AtlasFilter.CLIMBED,
                            onClick  = { onFilterChanged(AtlasFilter.CLIMBED) },
                            label    = { Text(stringResource(R.string.atlas_filter_captured, climbed.size), fontSize = 13.sp) },
                            colors   = atlasFilterChipColors(),
                            border   = atlasFilterChipBorder(filter == AtlasFilter.CLIMBED),
                        )
                        FilterChip(
                            selected = filter == AtlasFilter.NOT_YET,
                            onClick  = { onFilterChanged(AtlasFilter.NOT_YET) },
                            label    = { Text(stringResource(R.string.atlas_filter_not_captured), fontSize = 13.sp) },
                            colors   = atlasFilterChipColors(),
                            border   = atlasFilterChipBorder(filter == AtlasFilter.NOT_YET),
                        )
                    }
                }

                // ── ORDENAR ───────────────────────────────────────────────────
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text          = stringResource(R.string.atlas_section_sort),
                        fontSize      = 10.sp,
                        fontWeight    = FontWeight.ExtraBold,
                        letterSpacing = 1.sp,
                        color         = PeakSubtle,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = sortMode == SortMode.DISTANCE,
                            onClick  = { onSortModeChanged(SortMode.DISTANCE) },
                            label    = { Text(stringResource(R.string.atlas_sort_distance), fontSize = 13.sp) },
                            colors   = atlasFilterChipColors(),
                            border   = atlasFilterChipBorder(sortMode == SortMode.DISTANCE),
                        )
                        FilterChip(
                            selected = sortMode == SortMode.RELEVANCE,
                            onClick  = { onSortModeChanged(SortMode.RELEVANCE) },
                            label    = { Text(stringResource(R.string.atlas_sort_relevance), fontSize = 13.sp) },
                            colors   = atlasFilterChipColors(),
                            border   = atlasFilterChipBorder(sortMode == SortMode.RELEVANCE),
                        )
                        FilterChip(
                            selected = sortMode == SortMode.ALTITUDE,
                            onClick  = { onSortModeChanged(SortMode.ALTITUDE) },
                            label    = { Text(stringResource(R.string.atlas_sort_altitude), fontSize = 13.sp) },
                            colors   = atlasFilterChipColors(),
                            border   = atlasFilterChipBorder(sortMode == SortMode.ALTITUDE),
                        )
                    }
                }

                Spacer(Modifier.height(4.dp))
            }

            HorizontalDivider(color = PeakBorderLight)

            // ── "Ver X cimas" CTA ─────────────────────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 14.dp)
                    .navigationBarsPadding(),
            ) {
                Button(
                    onClick   = onDismiss,
                    modifier  = Modifier.fillMaxWidth().height(52.dp),
                    shape     = RoundedCornerShape(28.dp),
                    colors    = ButtonDefaults.buttonColors(containerColor = PeakGreenCTA),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp),
                ) {
                    Text(
                        text       = pluralStringResource(
                            R.plurals.atlas_filters_see_peaks, filteredCount, filteredCount,
                        ),
                        fontSize   = 15.sp,
                        fontWeight = FontWeight.ExtraBold,
                    )
                }
            }
        }
    }
}

@Composable
private fun RarityPill(
    rarity: Rarity,
    count: Int,
    selected: Boolean,
    onToggle: () -> Unit,
) {
    val rarityColor = remember(rarity.color) {
        runCatching {
            androidx.compose.ui.graphics.Color(android.graphics.Color.parseColor(rarity.color))
        }.getOrDefault(PeakClimbedGreen)
    }
    val rarityColorDark = remember(rarity.colorDark) {
        runCatching {
            androidx.compose.ui.graphics.Color(android.graphics.Color.parseColor(rarity.colorDark))
        }.getOrDefault(rarityColor)
    }

    // Locked = no climbs yet, shown at reduced opacity
    val isLocked = count == 0

    val emojiColor  = if (isLocked) androidx.compose.ui.graphics.Color(0xFFCBD5E1) else rarityColor
    val borderColor = when {
        selected -> rarityColor.copy(alpha = 0.53f)
        isLocked -> androidx.compose.ui.graphics.Color(0xFFF1F5F9)
        else     -> PeakBorderLight
    }
    val bgColor = when {
        selected -> rarityColor.copy(alpha = 0.13f)
        isLocked -> androidx.compose.ui.graphics.Color(0xFFF8FAFC)
        else     -> PeakSurfaceAlt
    }
    val textColor  = when {
        selected -> rarityColorDark
        isLocked -> androidx.compose.ui.graphics.Color(0xFFCBD5E1)
        else     -> PeakMuted
    }
    val countColor = when {
        selected -> rarityColorDark
        isLocked -> androidx.compose.ui.graphics.Color(0xFFCBD5E1)
        else     -> PeakSubtle
    }

    // Use label if non-empty; fall back to capitalized ID so something always shows
    val displayLabel = rarity.label.takeIf { it.isNotBlank() && it != "–" && it != "-" }
        ?: rarity.id.replaceFirstChar { it.uppercase() }

    Row(
        modifier = Modifier
            .then(if (isLocked) Modifier.alpha(0.55f) else Modifier)
            .border(1.5.dp, borderColor, RoundedCornerShape(999.dp))
            .background(bgColor, RoundedCornerShape(999.dp))
            .clickable(onClick = onToggle)
            .padding(horizontal = 11.dp, vertical = 7.dp),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text("✿", fontSize = 15.sp, color = emojiColor)
        Text(
            text       = displayLabel,
            fontSize   = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color      = textColor,
        )
        Text(
            text       = if (count > 0) count.toString() else "–",
            fontSize   = 11.sp,
            fontWeight = FontWeight.Bold,
            color      = countColor,
        )
    }
}

// ── FilterChip helpers — same palette used in CardsScreen ──────────────────

@Composable
private fun atlasFilterChipColors() = FilterChipDefaults.filterChipColors(
    containerColor         = PeakSurfaceAlt,
    labelColor             = PeakMuted,
    selectedContainerColor = PeakLayerActiveBg,
    selectedLabelColor     = PeakBlueActive,
)

@Composable
private fun atlasFilterChipBorder(selected: Boolean) =
    BorderStroke(1.5.dp, if (selected) PeakBlueActive else PeakBorderLight)

// ── Inline vector icons (avoids material-icons-core dependency) ───────────────

private val SearchIcon: ImageVector by lazy {
    ImageVector.Builder("Search", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke            = SolidColor(androidx.compose.ui.graphics.Color(0xFF9CA3AF)),
            strokeLineWidth   = 2f,
            strokeLineCap     = StrokeCap.Round,
            strokeLineJoin    = StrokeJoin.Round,
        ) {
            moveTo(11f, 11f)
            arcTo(7f, 7f, 0f, isMoreThanHalf = false, isPositiveArc = true, x1 = 4f, y1 = 11f)
            arcTo(7f, 7f, 0f, isMoreThanHalf = false, isPositiveArc = true, x1 = 11f, y1 = 4f)
            arcTo(7f, 7f, 0f, isMoreThanHalf = false, isPositiveArc = true, x1 = 18f, y1 = 11f)
            arcTo(7f, 7f, 0f, isMoreThanHalf = false, isPositiveArc = true, x1 = 11f, y1 = 18f)
            close()
        }
        path(
            stroke          = SolidColor(androidx.compose.ui.graphics.Color(0xFF9CA3AF)),
            strokeLineWidth = 2f,
            strokeLineCap   = StrokeCap.Round,
        ) { moveTo(16f, 16f); lineTo(22f, 22f) }
    }.build()
}

private val CloseIcon: ImageVector by lazy {
    ImageVector.Builder("Close", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color(0xFF6B7280)),
            strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round,
        ) { moveTo(18f, 6f); lineTo(6f, 18f) }
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color(0xFF6B7280)),
            strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round,
        ) { moveTo(6f, 6f); lineTo(18f, 18f) }
    }.build()
}

// Layers (stack) icon
private val LayersIcon: ImageVector by lazy {
    ImageVector.Builder("Layers", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color(0xFF1E293B)),
            strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(12f, 2f); lineTo(2f, 7f); lineTo(12f, 12f); lineTo(22f, 7f); close()
        }
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color(0xFF1E293B)),
            strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) { moveTo(2f, 17f); lineTo(12f, 22f); lineTo(22f, 17f) }
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color(0xFF1E293B)),
            strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) { moveTo(2f, 12f); lineTo(12f, 17f); lineTo(22f, 12f) }
    }.build()
}

// Location crosshair icon
private val LocationIcon: ImageVector by lazy {
    ImageVector.Builder("Location", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color(0xFF1E293B)),
            strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round,
        ) { moveTo(12f, 2f); lineTo(12f, 6f) }
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color(0xFF1E293B)),
            strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round,
        ) { moveTo(12f, 18f); lineTo(12f, 22f) }
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color(0xFF1E293B)),
            strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round,
        ) { moveTo(2f, 12f); lineTo(6f, 12f) }
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color(0xFF1E293B)),
            strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round,
        ) { moveTo(18f, 12f); lineTo(22f, 12f) }
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color(0xFF1E293B)),
            strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round,
        ) {
            moveTo(12f, 8f)
            arcTo(4f, 4f, 0f, isMoreThanHalf = false, isPositiveArc = true, 16f, 12f)
            arcTo(4f, 4f, 0f, isMoreThanHalf = false, isPositiveArc = true, 12f, 16f)
            arcTo(4f, 4f, 0f, isMoreThanHalf = false, isPositiveArc = true, 8f, 12f)
            arcTo(4f, 4f, 0f, isMoreThanHalf = false, isPositiveArc = true, 12f, 8f)
            close()
        }
    }.build()
}

// List (hamburger rows) icon
private val ListIcon: ImageVector by lazy {
    ImageVector.Builder("List", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color.White),
            strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round,
        ) { moveTo(8f, 6f); lineTo(21f, 6f) }
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color.White),
            strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round,
        ) { moveTo(8f, 12f); lineTo(21f, 12f) }
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color.White),
            strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round,
        ) { moveTo(8f, 18f); lineTo(21f, 18f) }
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color.White),
            strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round,
        ) {
            moveTo(3.5f, 6f)
            arcTo(0.5f, 0.5f, 0f, isMoreThanHalf = false, isPositiveArc = true, 3f, 6f)
            arcTo(0.5f, 0.5f, 0f, isMoreThanHalf = false, isPositiveArc = true, 3.5f, 6f)
            close()
        }
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color.White),
            strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round,
        ) {
            moveTo(3.5f, 12f)
            arcTo(0.5f, 0.5f, 0f, isMoreThanHalf = false, isPositiveArc = true, 3f, 12f)
            arcTo(0.5f, 0.5f, 0f, isMoreThanHalf = false, isPositiveArc = true, 3.5f, 12f)
            close()
        }
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color.White),
            strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round,
        ) {
            moveTo(3.5f, 18f)
            arcTo(0.5f, 0.5f, 0f, isMoreThanHalf = false, isPositiveArc = true, 3f, 18f)
            arcTo(0.5f, 0.5f, 0f, isMoreThanHalf = false, isPositiveArc = true, 3.5f, 18f)
            close()
        }
    }.build()
}

// Map outline icon (used in LayersPanel and Lista button — tint is applied by Icon)
private val MapOutlineIcon: ImageVector by lazy {
    ImageVector.Builder("Map", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color.Black),
            strokeLineWidth = 1.8f, strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(1f, 6f); lineTo(1f, 22f); lineTo(8f, 18f)
            lineTo(16f, 22f); lineTo(23f, 18f); lineTo(23f, 2f)
            lineTo(16f, 6f); lineTo(8f, 2f); lineTo(1f, 6f); close()
        }
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color.Black),
            strokeLineWidth = 1.8f, strokeLineCap = StrokeCap.Round,
        ) { moveTo(8f, 2f); lineTo(8f, 18f) }
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color.Black),
            strokeLineWidth = 1.8f, strokeLineCap = StrokeCap.Round,
        ) { moveTo(16f, 6f); lineTo(16f, 22f) }
    }.build()
}

// Terrain / mountain icon (for Relieve layer card)
private val TerrainIcon: ImageVector by lazy {
    ImageVector.Builder("Terrain", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color(0xFF1E293B)),
            strokeLineWidth = 1.8f, strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(1f, 20f); lineTo(7f, 8f); lineTo(12f, 14f)
            lineTo(16f, 6f); lineTo(23f, 20f); close()
        }
    }.build()
}

// Satellite / aerial imagery icon: rounded frame with 2×2 grid lines
private val SatelliteIcon: ImageVector by lazy {
    ImageVector.Builder("Satellite", 24.dp, 24.dp, 24f, 24f).apply {
        val stroke = SolidColor(androidx.compose.ui.graphics.Color(0xFF1E293B))
        // Rounded outer frame (r=3)
        path(stroke = stroke, strokeLineWidth = 1.75f,
            strokeLineCap = StrokeCap.Round, strokeLineJoin = StrokeJoin.Round) {
            moveTo(4f, 9f)
            curveTo(4f, 6.24f, 6.24f, 4f, 9f, 4f)
            lineTo(15f, 4f)
            curveTo(17.76f, 4f, 20f, 6.24f, 20f, 9f)
            lineTo(20f, 15f)
            curveTo(20f, 17.76f, 17.76f, 20f, 15f, 20f)
            lineTo(9f, 20f)
            curveTo(6.24f, 20f, 4f, 17.76f, 4f, 15f)
            close()
        }
        // Horizontal grid line
        path(stroke = stroke, strokeLineWidth = 1.1f, strokeLineCap = StrokeCap.Round) {
            moveTo(4f, 12f); lineTo(20f, 12f)
        }
        // Vertical grid line
        path(stroke = stroke, strokeLineWidth = 1.1f, strokeLineCap = StrokeCap.Round) {
            moveTo(12f, 4f); lineTo(12f, 20f)
        }
    }.build()
}

// Dashed trail / path icon (for Senderos layer card)
private val TrailsIcon: ImageVector by lazy {
    ImageVector.Builder("Trails", 24.dp, 24.dp, 24f, 24f).apply {
        // Zigzag line suggesting a trail
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color(0xFF1E293B)),
            strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) { moveTo(3f, 20f); lineTo(8f, 12f); lineTo(13f, 16f); lineTo(18f, 8f); lineTo(22f, 11f) }
    }.build()
}

// Small checkmark for active layer cards
private val CheckIcon: ImageVector by lazy {
    ImageVector.Builder("Check", 10.dp, 10.dp, 10f, 10f).apply {
        path(stroke = SolidColor(androidx.compose.ui.graphics.Color.White),
            strokeLineWidth = 1.8f, strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(1.5f, 5f); lineTo(4f, 7.5f); lineTo(8.5f, 2.5f)
        }
    }.build()
}

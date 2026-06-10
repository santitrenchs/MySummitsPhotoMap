package com.peakadex.app.feature.logbook

import android.graphics.Paint
import android.graphics.RectF
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.ui.unit.Dp
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import android.content.Intent
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.foundation.Canvas
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull
import androidx.compose.runtime.snapshotFlow
import coil3.compose.AsyncImage
import com.peakadex.app.R
import androidx.compose.ui.res.stringResource
import com.peakadex.app.AppContainer
import com.peakadex.app.core.model.Ascent
import com.peakadex.app.core.model.NearbyPeak
import com.peakadex.app.core.model.Peak
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import com.peakadex.app.core.ui.SkeletonBlock
import com.peakadex.app.core.ui.theme.PeakBlueActive
import com.peakadex.app.core.ui.theme.PeakGreenCTA
import com.peakadex.app.core.ui.theme.PeakBorderLight
import com.peakadex.app.core.ui.theme.PeakMuted
import com.peakadex.app.core.ui.RarityInfo
import com.peakadex.app.core.ui.RARITY_PALETTE
import com.peakadex.app.core.ui.rememberSkeletonBrush
import com.peakadex.app.core.ui.rarityForAltitude
import com.peakadex.app.core.ui.theme.PeakOnSurface
import com.peakadex.app.core.ui.theme.PeakSubtle
import com.peakadex.app.core.ui.theme.PeakTextHeadline
import com.peakadex.app.core.ui.UiText
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.ln
import kotlin.math.roundToInt
import kotlin.math.tan
import kotlin.math.sqrt

// Rarity palette lives in core/ui/RarityPalette.kt (shared with HomeScreen)

private const val NEARBY_PEAK_RADIUS_DEGREES = 0.8
private const val MAX_NEARBY_PEAKS = 5
private const val MIN_NEARBY_MARKER_DISTANCE_DP = 14f

private data class GridPoint(
    val xFrac: Float,
    val yFrac: Float,
)

private object NearbyPeaksCache {
    private val cache = mutableMapOf<String, List<NearbyPeak>>()
    private val inFlight = mutableSetOf<String>()

    fun cached(peakId: String): List<NearbyPeak>? = cache[peakId]

    suspend fun load(peak: Peak): List<NearbyPeak>? {
        cache[peak.id]?.let { return it }
        if (!inFlight.add(peak.id)) {
            while (inFlight.contains(peak.id)) {
                delay(50)
                cache[peak.id]?.let { return it }
            }
            return cache[peak.id] ?: emptyList()
        }

        return try {
            val nearby = AppContainer.apiService
                .getNearbyPeaks(
                    lat = peak.latitude,
                    lng = peak.longitude,
                    radius = NEARBY_PEAK_RADIUS_DEGREES,
                )
                .peaks
                .asSequence()
                .filter { it.id != peak.id }
                .sortedBy { distanceDegreesSquared(peak.latitude, peak.longitude, it.latitude, it.longitude) }
                .map {
                    NearbyPeak(
                        id = it.id,
                        name = it.name,
                        nameEn = it.nameEn,
                        latitude = it.latitude,
                        longitude = it.longitude,
                        altitudeM = it.altitudeM,
                        rarityId = it.rarityId,
                    )
                }
                .toList()
            cache[peak.id] = nearby
            nearby
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            android.util.Log.d("CardMiniMap", "nearby peaks fetch failed for ${peak.id}: ${e.message}")
            emptyList()
        } finally {
            inFlight.remove(peak.id)
        }
    }
}

// Returns a 2×2 grid of tile coordinates surrounding the peak, chosen so the peak
// lands as close to the centre of the composed grid as possible.
private data class PeakTileGrid(
    val cols: IntArray,       // [leftCol, rightCol]
    val rows: IntArray,       // [topRow,  bottomRow]
    val peakGridFracX: Float, // peak x as fraction of the 2-tile-wide grid [0..1]
    val peakGridFracY: Float, // peak y as fraction of the 2-tile-tall grid [0..1]
    val zoom: Int,
)

private fun peakTileGrid(lat: Double, lon: Double, zoom: Int = 12): PeakTileGrid {
    val n      = 1 shl zoom
    val xCont  = (lon + 180.0) / 360.0 * n
    val latRad = Math.toRadians(lat)
    val yCont  = (1.0 - ln(tan(latRad) + 1.0 / cos(latRad)) / PI) / 2.0 * n
    val xTile  = xCont.toInt().coerceIn(0, n - 1)
    val yTile  = yCont.toInt().coerceIn(0, n - 1)
    val fracX  = (xCont - xTile).toFloat()
    val fracY  = (yCont - yTile).toFloat()

    // Pick two horizontal tiles so the peak sits near the centre of the 2-wide grid.
    val leftCol: Int; val peakGridFracX: Float
    if (fracX >= 0.5f) {
        leftCol = xTile;                 peakGridFracX = fracX / 2f
    } else {
        leftCol = (xTile - 1).coerceAtLeast(0); peakGridFracX = (1f + fracX) / 2f
    }

    // Same vertically.
    val topRow: Int; val peakGridFracY: Float
    if (fracY >= 0.5f) {
        topRow = yTile;                  peakGridFracY = fracY / 2f
    } else {
        topRow = (yTile - 1).coerceAtLeast(0);  peakGridFracY = (1f + fracY) / 2f
    }

    return PeakTileGrid(
        cols          = intArrayOf(leftCol, leftCol + 1),
        rows          = intArrayOf(topRow,  topRow  + 1),
        peakGridFracX = peakGridFracX,
        peakGridFracY = peakGridFracY,
        zoom          = zoom,
    )
}

private fun gridPointFor(lat: Double, lon: Double, grid: PeakTileGrid): GridPoint {
    val n = 1 shl grid.zoom
    val xCont = (lon + 180.0) / 360.0 * n
    val latRad = Math.toRadians(lat)
    val yCont = (1.0 - ln(tan(latRad) + 1.0 / cos(latRad)) / PI) / 2.0 * n

    return GridPoint(
        xFrac = ((xCont - grid.cols.first()) / 2.0).toFloat(),
        yFrac = ((yCont - grid.rows.first()) / 2.0).toFloat(),
    )
}

// ── Custom icons ───────────────────────────────────────────────────────────────
// Search + filter icons now live in core/ui/PeakSearchComponents.kt (shared).

private val CloseSmallIcon: ImageVector by lazy {
    ImageVector.Builder("CloseSmall", 16.dp, 16.dp, 16f, 16f).apply {
        path(stroke = SolidColor(Color.Unspecified), strokeLineWidth = 1.8f, strokeLineCap = StrokeCap.Round) { moveTo(12f, 4f); lineTo(4f, 12f) }
        path(stroke = SolidColor(Color.Unspecified), strokeLineWidth = 1.8f, strokeLineCap = StrokeCap.Round) { moveTo(4f, 4f); lineTo(12f, 12f) }
    }.build()
}

// Share icon — 3 nodes connected by lines (matches web AscentCard).
// NOTE: paths must use a concrete colour (Color.Black). With Color.Unspecified the
// vector draws nothing, so the Icon `tint` has no pixels to recolour → invisible.
internal val ShareNetworkIcon: ImageVector by lazy {
    ImageVector.Builder("ShareNetwork", 20.dp, 20.dp, 20f, 20f).apply {
        // Top-right circle (cx=16, cy=4, r=2)
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 1.4f, fill = null) {
            moveTo(18f, 4f); arcTo(2f, 2f, 0f, false, true, 14f, 4f); arcTo(2f, 2f, 0f, false, true, 18f, 4f); close()
        }
        // Left circle (cx=4, cy=10, r=2)
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 1.4f, fill = null) {
            moveTo(6f, 10f); arcTo(2f, 2f, 0f, false, true, 2f, 10f); arcTo(2f, 2f, 0f, false, true, 6f, 10f); close()
        }
        // Bottom-right circle (cx=16, cy=16, r=2)
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 1.4f, fill = null) {
            moveTo(18f, 16f); arcTo(2f, 2f, 0f, false, true, 14f, 16f); arcTo(2f, 2f, 0f, false, true, 18f, 16f); close()
        }
        // Connecting lines
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 1.8f, strokeLineCap = StrokeCap.Round, fill = null) {
            moveTo(6f, 9f); lineTo(14f, 5f)
        }
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 1.8f, strokeLineCap = StrokeCap.Round, fill = null) {
            moveTo(6f, 11f); lineTo(14f, 15f)
        }
    }.build()
}

// Pencil / edit icon (matches web AscentCard). Concrete colour so the tint applies.
internal val PencilIcon: ImageVector by lazy {
    ImageVector.Builder("Pencil", 20.dp, 20.dp, 20f, 20f).apply {
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 1.8f,
            strokeLineCap = StrokeCap.Round, strokeLineJoin = StrokeJoin.Round, fill = null) {
            moveTo(14.5f, 2.5f)
            arcToRelative(2.121f, 2.121f, 0f, false, true, 3f, 3f)
            lineTo(6f, 17f); lineTo(3f, 17f); lineTo(3f, 14f)
            lineTo(14.5f, 2.5f); close()
        }
    }.build()
}

// ── Entry point ────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LogbookScreen(
    onEditAscent: (Ascent) -> Unit = {},
    initialPeakId:       String? = null,
    initialPeakName:     String? = null,
    onPeakIdConsumed:    () -> Unit = {},
    initialRarityId:     String? = null,
    onRarityIdConsumed:  () -> Unit = {},
    refreshTrigger: Int = 0,
    highlightId: String? = null,
    onHighlightConsumed: () -> Unit = {},
    vm: LogbookViewModel = viewModel(),
) {
    // Apply peak filter from Atlas navigation once, then signal consumed so the
    // caller can clear the pending state (prevents re-applying on recomposition).
    // clearFilters() first so any residual rarityId/viewFilter from a previous
    // navigation session doesn't bleed through when the ViewModel is reused.
    LaunchedEffect(initialPeakId) {
        if (initialPeakId != null) {
            vm.clearFilters()
            vm.setPeakFilter(initialPeakId, initialPeakName)
            onPeakIdConsumed()
        }
    }

    // Apply rarity filter from Home chart navigation once, then signal consumed.
    // clearFilters() first for the same reason — clears any leftover peakId or
    // other filters before applying the rarity + switching to Mine view.
    LaunchedEffect(initialRarityId) {
        if (initialRarityId != null) {
            vm.clearFilters()
            vm.setRarityId(initialRarityId)
            vm.setViewFilter(ViewFilter.Mine)
            onRarityIdConsumed()
        }
    }

    // When arriving right after creating an ascent (refreshTrigger > 0), switch to
    // the Mine filter SYNCHRONOUSLY on the first composition — before the initial
    // load completes — so the Friends feed never flashes before we switch.
    remember(refreshTrigger) {
        if (refreshTrigger > 0) vm.setViewFilter(ViewFilter.Mine)
        refreshTrigger
    }

    val uiState         by vm.uiState.collectAsStateWithLifecycle()
    val isRefreshing    by vm.isRefreshing.collectAsStateWithLifecycle()
    val filters         by vm.filters.collectAsStateWithLifecycle()
    val filteredAscents by vm.filteredAscents.collectAsStateWithLifecycle()

    // Hoist list state here so we can scroll-to-top from the refresh LaunchedEffect
    val listState = rememberLazyListState()

    LaunchedEffect(refreshTrigger) {
        if (refreshTrigger > 0) {
            vm.setViewFilter(ViewFilter.Mine)
            vm.refresh()
            // Wait until the LazyColumn is laid out — animateScrollToItem is a no-op
            // if called before the list has performed its first layout pass.
            withTimeoutOrNull(10_000L) {
                snapshotFlow { listState.layoutInfo.totalItemsCount }
                    .filter { it > 0 }
                    .first()
            } ?: return@LaunchedEffect  // network error — give up silently

            // Scroll to the exact position of the new ascent (not necessarily index 0,
            // since the server's canonical sort may place it after unseen friends etc.)
            val targetIdx = filteredAscents.indexOfFirst { it.id == highlightId }
                .takeIf { it >= 0 } ?: 0
            listState.animateScrollToItem(targetIdx)
        }
    }

    val context = LocalContext.current
    val onShareClick: (String) -> Unit = { ascentId ->
        vm.shareAscent(ascentId)
        val url = "https://www.peakadex.com/ascent/$ascentId"
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, url)
        }
        context.startActivity(Intent.createChooser(intent, null))
    }

    // Hide filter bar on scroll-down, show on scroll-up — same pattern as bottom bar.
    var isFilterBarVisible by remember { mutableStateOf(true) }
    val filterScrollConnection = remember {
        object : NestedScrollConnection {
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                when {
                    available.y < -3f -> isFilterBarVisible = false
                    available.y >  3f -> isFilterBarVisible = true
                }
                return Offset.Zero
            }
        }
    }
    // Always show filter bar when filters change (so user sees their active state)
    LaunchedEffect(filters.isDirty) { isFilterBarVisible = true }

    var showFiltersPanel by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize().nestedScroll(filterScrollConnection)) {

        // ── Search + filters button bar ───────────────────────────────────────
        AnimatedVisibility(
            visible = isFilterBarVisible,
            enter   = slideInVertically(animationSpec = tween(200), initialOffsetY = { -it }),
            exit    = slideOutVertically(animationSpec = tween(200), targetOffsetY = { -it }),
        ) {
            QuickFilterBar(
                filters        = filters,
                filteredCount  = filteredAscents.size,
                onSearchChange = vm::setSearch,
                onOpenFilters  = { showFiltersPanel = true },
            )
        }

        // ── Peak filter chip — only when navigating from Atlas ─────────────
        if (filters.peakId != null) {
            PeakFilterChip(
                peakName  = filters.peakName ?: filters.peakId ?: "",
                onDismiss = { vm.setPeakFilter(null, null) },
            )
        }

        // ── Rarity filter chip — shown when set from Home charts ──────────
        // (when rarityId is set from the filter panel there's no separate chip;
        //  the filters button itself turns blue to indicate active state)
        if (filters.rarityId != null && filters.peakId == null) {
            val rarityInfo = RARITY_PALETTE.find { it.id == filters.rarityId }
            if (rarityInfo != null) {
                RarityFilterChip(
                    rarityInfo = rarityInfo,
                    onDismiss  = { vm.setRarityId(null) },
                )
            }
        }

        when (uiState) {
            is LogbookUiState.Loading -> LogbookLoadingState()
            is LogbookUiState.Error   -> LogbookErrorState((uiState as LogbookUiState.Error).message.asString()) { vm.load() }
            is LogbookUiState.Success -> PullToRefreshBox(
                isRefreshing = isRefreshing,
                onRefresh    = { vm.refresh() },
                modifier     = Modifier.fillMaxSize(),
            ) {
                when {
                    filteredAscents.isEmpty() && (filters.peakId != null || filters.rarityId != null || filters.mythic || filters.search.isNotBlank()) ->
                        LogbookNoResultsState()
                    filteredAscents.isEmpty() && filters.viewFilter == ViewFilter.Friends ->
                        LogbookFriendsEmptyState()
                    filteredAscents.isEmpty() ->
                        LogbookEmptyState()
                    else ->
                        LogbookList(
                            ascents             = filteredAscents,
                            onEditAscent        = onEditAscent,
                            onShareClick        = onShareClick,
                            listState           = listState,
                            highlightId         = highlightId,
                            onHighlightConsumed = onHighlightConsumed,
                        )
                }
            }
        }
    }

    // ── Filters panel ─────────────────────────────────────────────────────────
    if (showFiltersPanel) {
        LogbookFiltersPanel(
            filters        = filters,
            filteredCount  = filteredAscents.size,
            onViewFilterChange = vm::setViewFilter,
            onRarityChange     = vm::setRarityId,
            onMythicChange     = vm::setMythic,
            onClearAll         = vm::clearFilters,
            onDismiss          = { showFiltersPanel = false },
        )
    }
}

// ── Quick filter bar — search + filters button ────────────────────────────────

@Composable
private fun QuickFilterBar(
    filters: LogbookFilterState,
    filteredCount: Int,
    onSearchChange: (String) -> Unit,
    onOpenFilters: () -> Unit,
) {
    val hasActiveFilters = filters.isDirty
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color.White),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            com.peakadex.app.core.ui.PeakSearchField(
                value         = filters.search,
                onValueChange = onSearchChange,
                placeholder   = stringResource(R.string.logbook_search_hint),
                modifier      = Modifier.weight(1f),
            )
            com.peakadex.app.core.ui.PeakFilterButton(
                label     = stringResource(R.string.logbook_filters_title),
                active    = hasActiveFilters,
                showBadge = hasActiveFilters,
                onClick   = onOpenFilters,
            )
        }
        HorizontalDivider(thickness = 1.dp, color = Color.Black.copy(alpha = 0.06f))
    }
}

// ── Filters panel (ModalBottomSheet) ─────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun LogbookFiltersPanel(
    filters: LogbookFilterState,
    filteredCount: Int,
    onViewFilterChange: (ViewFilter) -> Unit,
    onRarityChange: (String?) -> Unit,
    onMythicChange: (Boolean) -> Unit,
    onClearAll: () -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState       = sheetState,
        containerColor   = Color.White,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(bottom = 20.dp),
        ) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text       = stringResource(R.string.logbook_filters_title),
                    fontSize   = 17.sp,
                    fontWeight = FontWeight.SemiBold,
                    color      = Color(0xFF111827),
                    modifier   = Modifier.weight(1f),
                )
                if (filters.isDirty) {
                    TextButton(onClick = onClearAll) {
                        Text(
                            text     = stringResource(R.string.logbook_filters_clear),
                            fontSize = 14.sp,
                            color    = PeakBlueActive,
                        )
                    }
                }
            }

            HorizontalDivider(color = Color(0xFFF3F4F6))
            Spacer(Modifier.height(16.dp))

            // ── VISTA ──────────────────────────────────────────────────────────
            Text(
                text     = stringResource(R.string.logbook_filters_section_view),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.08.em,
                color    = PeakMuted,
                modifier = Modifier.padding(horizontal = 20.dp),
            )
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FilterToggleChip(
                    label    = stringResource(R.string.logbook_filter_mine),
                    selected = filters.viewFilter == ViewFilter.Mine,
                    onClick  = { onViewFilterChange(ViewFilter.Mine) },
                )
                FilterToggleChip(
                    label    = stringResource(R.string.logbook_filter_friends),
                    selected = filters.viewFilter == ViewFilter.Friends,
                    onClick  = { onViewFilterChange(ViewFilter.Friends) },
                )
            }

            Spacer(Modifier.height(20.dp))

            // ── RAREZA ─────────────────────────────────────────────────────────
            Text(
                text     = stringResource(R.string.logbook_filters_section_rarity),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.08.em,
                color    = PeakMuted,
                modifier = Modifier.padding(horizontal = 20.dp),
            )
            Spacer(Modifier.height(8.dp))
            FlowRow(
                modifier            = Modifier.padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement   = Arrangement.spacedBy(8.dp),
            ) {
                RARITY_PALETTE.forEach { rarity ->
                    val isSelected = !filters.mythic && filters.rarityId == rarity.id
                    RarityToggleChip(
                        rarity   = rarity,
                        selected = isSelected,
                        onClick  = {
                            if (isSelected) onRarityChange(null)
                            else { onMythicChange(false); onRarityChange(rarity.id) }
                        },
                    )
                }
                // Mythic chip
                val mythicSelected = filters.mythic
                FilterToggleChip(
                    label    = "⭐ Mítico",
                    selected = mythicSelected,
                    selectedBg     = Color(0xFFFFFBEB),
                    selectedBorder = Color(0xFFFDE68A),
                    selectedText   = Color(0xFF92400E),
                    onClick  = {
                        if (mythicSelected) onMythicChange(false)
                        else { onRarityChange(null); onMythicChange(true) }
                    },
                )
            }

            Spacer(Modifier.height(24.dp))

            // ── CTA ────────────────────────────────────────────────────────────
            Button(
                onClick  = onDismiss,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .height(50.dp),
                shape  = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PeakGreenCTA),
            ) {
                Text(
                    text       = stringResource(R.string.logbook_filters_see_cards, filteredCount),
                    fontSize   = 15.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color      = Color.White,
                )
            }
        }
    }
}

@Composable
private fun FilterToggleChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    selectedBg: Color     = Color(0xFFEFF6FF),
    selectedBorder: Color = Color(0xFF7DD3FC),
    selectedText: Color   = Color(0xFF0369A1),
) {
    val bg     = if (selected) selectedBg     else Color(0xFFF1F5F9)
    val border = if (selected) selectedBorder else Color.Transparent
    val text   = if (selected) selectedText   else Color(0xFF374151)
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(100.dp))
            .background(bg)
            .border(1.dp, border, RoundedCornerShape(100.dp))
            .clickable(indication = null, interactionSource = remember { MutableInteractionSource() }) { onClick() }
            .padding(horizontal = 14.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = text)
    }
}

@Composable
private fun RarityToggleChip(
    rarity: RarityInfo,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val bg     = if (selected) rarity.color.copy(alpha = 0.13f) else Color(0xFFF1F5F9)
    val border = if (selected) rarity.color.copy(alpha = 0.45f) else Color.Transparent
    val text   = if (selected) rarity.color else Color(0xFF374151)
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(100.dp))
            .background(bg)
            .border(1.dp, border, RoundedCornerShape(100.dp))
            .clickable(indication = null, interactionSource = remember { MutableInteractionSource() }) { onClick() }
            .padding(horizontal = 12.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text       = "✿ ${rarity.label}",
            fontSize   = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color      = text,
        )
    }
}

// ── Peak filter chip — shown when navigating from Atlas ───────────────────────

@Composable
private fun PeakFilterChip(peakName: String, onDismiss: () -> Unit) {
    Row(
        modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 6.dp),
    ) {
        InputChip(
            selected     = true,
            onClick      = onDismiss,
            label        = { Text("🏔 $peakName", fontSize = 12.sp, fontWeight = FontWeight.SemiBold) },
            trailingIcon = {
                Icon(CloseSmallIcon, stringResource(R.string.action_close), Modifier.size(14.dp), tint = Color(0xFF0369A1))
            },
            colors = InputChipDefaults.inputChipColors(
                selectedContainerColor = Color(0xFFF0F9FF),
                selectedLabelColor     = Color(0xFF0369A1),
            ),
            border = InputChipDefaults.inputChipBorder(
                enabled             = true,
                selected            = true,
                selectedBorderColor = Color(0xFF7DD3FC),
                selectedBorderWidth = 1.dp,
            ),
        )
    }
}

// ── Rarity filter chip — shown when navigating from Home charts ───────────────

@Composable
private fun RarityFilterChip(rarityInfo: RarityInfo, onDismiss: () -> Unit) {
    Row(
        modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 6.dp),
    ) {
        InputChip(
            selected     = true,
            onClick      = onDismiss,
            label        = {
                Text(
                    "✿ ${rarityInfo.label}",
                    fontSize   = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            },
            trailingIcon = {
                Icon(
                    CloseSmallIcon,
                    contentDescription = stringResource(R.string.action_close),
                    modifier           = Modifier.size(14.dp),
                    tint               = rarityInfo.color,
                )
            },
            colors = InputChipDefaults.inputChipColors(
                selectedContainerColor = rarityInfo.color.copy(alpha = 0.08f),
                selectedLabelColor     = rarityInfo.color,
            ),
            border = InputChipDefaults.inputChipBorder(
                enabled             = true,
                selected            = true,
                selectedBorderColor = rarityInfo.color.copy(alpha = 0.4f),
                selectedBorderWidth = 1.dp,
            ),
        )
    }
}

// ── List ───────────────────────────────────────────────────────────────────────

@Composable
private fun LogbookList(
    ascents: List<Ascent>,
    onEditAscent: (Ascent) -> Unit,
    onShareClick: (String) -> Unit,
    listState: androidx.compose.foundation.lazy.LazyListState = rememberLazyListState(),
    highlightId: String? = null,
    onHighlightConsumed: () -> Unit = {},
) {
    // Mirror web: show sky-blue ring for 2500ms then fade it out over 400ms
    LaunchedEffect(highlightId) {
        if (highlightId != null) {
            delay(2_500L)
            onHighlightConsumed()
        }
    }

    LazyColumn(
        state               = listState,
        contentPadding      = PaddingValues(horizontal = 16.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        items(ascents, key = { it.id }) { ascent ->
            AscentFlipCard(
                ascent        = ascent,
                onEditClick   = { onEditAscent(ascent) },
                onShareClick  = { onShareClick(ascent.id) },
                isHighlighted = ascent.id == highlightId,
            )
        }
    }
}

// ── Flip card ──────────────────────────────────────────────────────────────────

@Composable
private fun AscentFlipCard(
    ascent:       Ascent,
    onEditClick:  () -> Unit,
    onShareClick: () -> Unit,
    isHighlighted: Boolean = false,
) {
    var isFlipped by remember { mutableStateOf(false) }
    val rotation by animateFloatAsState(
        targetValue   = if (isFlipped) 180f else 0f,
        animationSpec = tween(durationMillis = 700, easing = FastOutSlowInEasing),
        label         = "card_flip",
    )
    // Sky-blue ring: appears instantly when highlighted, fades out over 400ms when cleared.
    // Matches web: boxShadow "0 0 0 3px #0ea5e9, 0 4px 24px rgba(14,165,233,0.35)"
    val ringAlpha by animateFloatAsState(
        targetValue   = if (isHighlighted) 1f else 0f,
        animationSpec = tween(durationMillis = if (isHighlighted) 0 else 400),
        label         = "highlight_ring",
    )
    val density = LocalDensity.current.density
    val rarity  = rarityForAltitude(ascent.peak.altitudeM)

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(elevation = 8.dp, shape = RoundedCornerShape(28.dp), clip = false,
                ambientColor = Color(0x1A0D2538), spotColor = Color(0x1A0D2538))
            .then(
                if (ringAlpha > 0f) Modifier.border(
                    width = 3.dp,
                    color = Color(0xFF0EA5E9).copy(alpha = ringAlpha),
                    shape = RoundedCornerShape(28.dp),
                ) else Modifier
            ),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .graphicsLayer { rotationY = rotation; cameraDistance = 12f * density }
                .clip(RoundedCornerShape(28.dp))
                .clickable(indication = null, interactionSource = remember { MutableInteractionSource() }) { isFlipped = !isFlipped },
        ) {
            if (rotation <= 90f) {
                CardFront(
                    ascent       = ascent,
                    rarity       = rarity,
                    onEditClick  = onEditClick,
                    onShareClick = onShareClick,
                )
            } else {
                Box(Modifier.graphicsLayer { rotationY = 180f }) {
                    CardBack(ascent = ascent, rarity = rarity)
                }
            }
        }
    }
}

// ── Card front ─────────────────────────────────────────────────────────────────

@Composable
internal fun CardFront(
    ascent:       Ascent,
    rarity:       RarityInfo,
    onEditClick:  () -> Unit,
    onShareClick: () -> Unit,
) {
    val heroUrl  = ascent.photos.firstOrNull()?.url
    val userName = ascent.user?.name ?: stringResource(R.string.logbook_you)
    val initials = userName.split(" ").take(2).mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("")

    Column(modifier = Modifier.fillMaxWidth().background(Color.White).padding(7.dp)) {
        Row(
            modifier          = Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(contentAlignment = Alignment.TopEnd) {
                Box(modifier = Modifier.size(32.dp).clip(CircleShape).background(Color(0xFFE2E8F0)), contentAlignment = Alignment.Center) {
                    if (ascent.user?.avatarUrl != null) {
                        AsyncImage(model = ascent.user.avatarUrl, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    } else {
                        Text(initials.take(2).ifEmpty { "?" }, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B))
                    }
                }
                // Green dot = unseen (new ascent from a friend)
                if (ascent.isUnseen) {
                    Box(
                        modifier = Modifier
                            .size(9.dp)
                            .offset(x = 1.dp, y = (-1).dp)
                            .clip(CircleShape)
                            .background(Color(0xFF22C55E))
                    )
                }
            }
            Spacer(Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(userName, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = PeakTextHeadline)
                Text(formatDate(ascent.date), fontSize = 11.sp, color = PeakSubtle)
            }
            // Share + Edit icons — only on own ascents (same as web "profile" variant)
            if (ascent.isOwn) {
                Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                    IconButton(
                        onClick   = onShareClick,
                        modifier  = Modifier.size(28.dp),
                    ) {
                        Icon(
                            imageVector        = ShareNetworkIcon,
                            contentDescription = stringResource(R.string.action_share),
                            modifier           = Modifier.size(16.dp),
                            tint               = PeakSubtle,
                        )
                    }
                    IconButton(
                        onClick   = onEditClick,
                        modifier  = Modifier.size(28.dp),
                    ) {
                        Icon(
                            imageVector        = PencilIcon,
                            contentDescription = stringResource(R.string.action_edit),
                            modifier           = Modifier.size(15.dp),
                            tint               = PeakSubtle,
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(2.dp))

        Box(
            modifier = Modifier
                .fillMaxWidth().padding(horizontal = 3.dp).aspectRatio(4f / 5f)
                .clip(RoundedCornerShape(18.dp)).background(Color(0xFFF1F5F9)),
        ) {
            if (heroUrl != null) {
                AsyncImage(model = heroUrl, contentDescription = ascent.peak.name, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            } else {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("🏔️", fontSize = 52.sp) }
            }

            Box(
                modifier = Modifier.fillMaxWidth().fillMaxHeight(0.55f).align(Alignment.BottomStart)
                    .background(Brush.verticalGradient(colorStops = arrayOf(0f to Color.Transparent, 0.3f to Color(0x6B07121F), 1f to Color(0xD107121F)))),
            )

            Column(modifier = Modifier.fillMaxWidth().align(Alignment.BottomStart).padding(horizontal = 12.dp, vertical = 12.dp)) {
                Text(ascent.peak.name, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = Color.White,
                    letterSpacing = (-0.035).em, maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (!ascent.route.isNullOrBlank()) {
                    Spacer(Modifier.height(2.dp))
                    Text(ascent.route, fontSize = 13.sp, color = Color(0xCCFFFFFF), maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Spacer(Modifier.height(3.dp))
                Text(
                    listOfNotNull(ascent.peak.mountainRange, "${ascent.peak.altitudeM} m").joinToString(" · "),
                    fontSize = 10.sp, color = Color(0x99FFFFFF), maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
            }
        }

        Spacer(Modifier.height(6.dp))

        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 3.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            StatBandItem(stringResource(R.string.logbook_stat_rarity),   "✿ ${rarity.label}", rarity.color,       Modifier.weight(1f))
            StatBandItem(stringResource(R.string.logbook_stat_altitude), "${ascent.peak.altitudeM} m", PeakOnSurface, Modifier.weight(1f))
            StatBandItem(stringResource(R.string.logbook_stat_ep),        "+${rarity.ep}",     rarity.color,       Modifier.weight(1f))
        }
        Spacer(Modifier.height(3.dp))
    }
}

@Composable
internal fun StatBandItem(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFF8FAFC)).padding(horizontal = 8.dp, vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(label, fontSize = 9.sp, fontWeight = FontWeight.Black, letterSpacing = 0.09.em, color = Color(0xFF8A94A3))
        Spacer(Modifier.height(2.dp))
        Text(value, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = color, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

// ── Card minimap (2×2 tile grid centred on peak + Canvas dot) ─────────────────
//
// Loads a 2×2 grid of tiles chosen so the peak is near the centre of the grid,
// then offsets the grid so the peak falls exactly at the container's centre.
// The dot is always drawn at the container centre, matching the map below it.

@Composable
private fun CardMiniMap(peak: Peak, rarityColor: androidx.compose.ui.graphics.Color) {
    val grid = remember(peak.latitude, peak.longitude) { peakTileGrid(peak.latitude, peak.longitude) }
    val precalculatedNearbyPeaks = peak.nearbyPeaks
    var nearbyPeaks by remember(peak.id) {
        mutableStateOf(precalculatedNearbyPeaks ?: NearbyPeaksCache.cached(peak.id).orEmpty())
    }

    LaunchedEffect(peak.id, precalculatedNearbyPeaks) {
        if (precalculatedNearbyPeaks != null) {
            nearbyPeaks = precalculatedNearbyPeaks
        } else if (nearbyPeaks.isEmpty()) {
            android.util.Log.d("CardMiniMap", "nearbyPeaks missing in ascent payload for ${peak.id}; falling back to API")
            NearbyPeaksCache.load(peak)?.let { nearbyPeaks = it }
        }
    }

    val density = LocalDensity.current

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .clipToBounds(),
    ) {
        // Work entirely in integer pixels so adjacent tile edges land on the
        // EXACT same pixel — eliminates the sub-pixel seam gap that appears when
        // each tile is offset independently in Dp.
        val wPx = with(density) { maxWidth.roundToPx() }
        val hPx = with(density) { maxHeight.roundToPx() }

        // Grid must be ≥ 2×max(w,h) so the 2×2 tile grid covers the whole
        // container after the peak-centering offset (peakGridFrac ∈ [0.25, 0.75]).
        val gridPx = maxOf(wPx, hPx) * 2
        val tilePx = gridPx / 2                 // integer → tiles tile seamlessly
        val tileDp = with(density) { tilePx.toDp() }

        // Integer-pixel offset that places the peak at the exact container centre.
        val offX = wPx / 2 - (gridPx * grid.peakGridFracX).roundToInt()
        val offY = hPx / 2 - (gridPx * grid.peakGridFracY).roundToInt()

        // CRITICAL: use requiredSize, NOT size.  Each tile is ~2× the container
        // width, and plain .size() coerces the requested size into the parent's
        // incoming max constraints — clamping the tile narrower than tilePx and
        // leaving a dark gap between columns.  requiredSize() ignores the parent
        // constraints and forces the exact tilePx; clipToBounds trims the excess.
        for (row in 0..1) {
            for (col in 0..1) {
                val tileX = grid.cols[col]
                val tileY = grid.rows[row]
                val url   = "https://a.basemaps.cartocdn.com/rastertiles/voyager/${grid.zoom}/$tileX/$tileY@2x.png"
                AsyncImage(
                    model              = url,
                    contentDescription = null,
                    contentScale       = ContentScale.FillBounds,
                    modifier           = Modifier
                        .requiredSize(tileDp)
                        .offset { IntOffset(offX + tilePx * col, offY + tilePx * row) },
                )
            }
        }

        // Nearby peaks are secondary: smaller, hollow, and collision-culled so
        // dense ranges don't turn into an unreadable stack of dots.
        Canvas(modifier = Modifier.fillMaxSize()) {
            val cx = size.width  / 2f
            val cy = size.height / 2f
            val minDist = MIN_NEARBY_MARKER_DISTANCE_DP.dp.toPx()
            val placed = mutableListOf<androidx.compose.ui.geometry.Offset>()
            val labelRects = mutableListOf<RectF>()
            val mainPeakGuard = RectF(cx - 20.dp.toPx(), cy - 20.dp.toPx(), cx + 20.dp.toPx(), cy + 20.dp.toPx())
            val labelMaxWidth = 104.dp.toPx()
            val labelGap = 8.dp.toPx()
            val labelTextSize = 8.5.sp.toPx()
            val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color(0xFF1E293B).toArgb()
                textSize = labelTextSize
                typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
            }
            val labelHaloPaint = Paint(labelPaint).apply {
                color = Color.White.copy(alpha = 0.92f).toArgb()
                style = Paint.Style.STROKE
                strokeWidth = 3.dp.toPx()
                strokeJoin = Paint.Join.ROUND
            }
            val labelMetrics = labelPaint.fontMetrics
            val labelHeight = labelMetrics.descent - labelMetrics.ascent
            val labelBottomLimit = size.height - 126.dp.toPx()

            nearbyPeaks.forEach { nearby ->
                if (placed.size >= MAX_NEARBY_PEAKS) return@forEach
                val p = gridPointFor(nearby.latitude, nearby.longitude, grid)
                val x = offX + gridPx * p.xFrac
                val y = offY + gridPx * p.yFrac
                if (x < 10.dp.toPx() || x > size.width - 10.dp.toPx()) return@forEach
                if (y < 10.dp.toPx() || y > size.height - 10.dp.toPx()) return@forEach

                val pos = androidx.compose.ui.geometry.Offset(x, y)
                val tooCloseToMain = distance(pos, androidx.compose.ui.geometry.Offset(cx, cy)) < minDist
                val tooCloseToOther = placed.any { distance(pos, it) < minDist }
                if (tooCloseToMain || tooCloseToOther) return@forEach

                placed.add(pos)
                drawCircle(color = Color.White.copy(alpha = 0.90f), radius = 6.dp.toPx(), center = pos)
                drawCircle(
                    color = Color(0xFF1E293B).copy(alpha = 0.58f),
                    radius = 4.dp.toPx(),
                    center = pos,
                    style = Stroke(width = 1.5.dp.toPx()),
                )

                if (pos.y < labelBottomLimit) {
                    val rawLabel = "${nearby.name} · ${nearby.altitudeM} m"
                    val label = fitTextToWidth(rawLabel, labelPaint, labelMaxWidth)
                    val labelWidth = labelPaint.measureText(label)
                    val baselineY = pos.y + (labelHeight / 2f) - labelMetrics.descent
                    val labelTop = baselineY + labelMetrics.ascent - 3.dp.toPx()
                    val labelBottom = baselineY + labelMetrics.descent + 3.dp.toPx()
                    val rightRect = RectF(
                        pos.x + labelGap,
                        labelTop,
                        pos.x + labelGap + labelWidth,
                        labelBottom,
                    )
                    val leftRect = RectF(
                        pos.x - labelGap - labelWidth,
                        labelTop,
                        pos.x - labelGap,
                        labelBottom,
                    )
                    val topBaselineY = pos.y - labelGap
                    val topRect = RectF(
                        pos.x - labelWidth / 2f,
                        topBaselineY + labelMetrics.ascent - 3.dp.toPx(),
                        pos.x + labelWidth / 2f,
                        topBaselineY + labelMetrics.descent + 3.dp.toPx(),
                    )
                    val bottomBaselineY = pos.y + labelGap + labelHeight
                    val bottomRect = RectF(
                        pos.x - labelWidth / 2f,
                        bottomBaselineY + labelMetrics.ascent - 3.dp.toPx(),
                        pos.x + labelWidth / 2f,
                        bottomBaselineY + labelMetrics.descent + 3.dp.toPx(),
                    )
                    val labelRect = listOf(rightRect, leftRect, topRect, bottomRect).firstOrNull { rect ->
                        rect.left >= 8.dp.toPx() &&
                            rect.right <= size.width - 8.dp.toPx() &&
                            rect.top >= 8.dp.toPx() &&
                            rect.bottom <= labelBottomLimit &&
                            !RectF.intersects(rect, mainPeakGuard) &&
                            labelRects.none { RectF.intersects(rect, it) }
                    }
                    if (labelRect != null) {
                        labelRects.add(labelRect)
                        val textX = labelRect.left
                        val textBaselineY = when (labelRect) {
                            topRect -> topBaselineY
                            bottomRect -> bottomBaselineY
                            else -> baselineY
                        }
                        drawContext.canvas.nativeCanvas.drawText(label, textX, textBaselineY, labelHaloPaint)
                        drawContext.canvas.nativeCanvas.drawText(label, textX, textBaselineY, labelPaint)
                    }
                }
            }

            // Peak dot is always at the exact centre of the container.
            drawCircle(color = Color.White, radius = 11.dp.toPx(), center = androidx.compose.ui.geometry.Offset(cx, cy))
            drawCircle(color = rarityColor,  radius =  8.dp.toPx(), center = androidx.compose.ui.geometry.Offset(cx, cy))
        }
    }
}

private fun distance(a: androidx.compose.ui.geometry.Offset, b: androidx.compose.ui.geometry.Offset): Float {
    val dx = a.x - b.x
    val dy = a.y - b.y
    return sqrt(dx * dx + dy * dy)
}

private fun distanceDegreesSquared(latA: Double, lonA: Double, latB: Double, lonB: Double): Double {
    val dLat = latA - latB
    val dLon = lonA - lonB
    return dLat * dLat + dLon * dLon
}

private fun fitTextToWidth(text: String, paint: Paint, maxWidth: Float): String {
    if (paint.measureText(text) <= maxWidth) return text
    val suffix = "..."
    var end = text.length
    while (end > 0 && paint.measureText(text.substring(0, end).trimEnd() + suffix) > maxWidth) {
        end--
    }
    return if (end <= 0) suffix else text.substring(0, end).trimEnd() + suffix
}

// ── Elevation profile ──────────────────────────────────────────────────────────

@Composable
private fun ElevationProfileCanvas(
    peakId: String,
    profile: com.peakadex.app.core.model.ElevationProfileData?,
    altitudeM: Int,
    modifier: Modifier = Modifier,
) {
    // Start with whatever the API response gave us (may be null if not included).
    var resolvedProfile by remember(peakId) { mutableStateOf(profile) }
    var fetchFailed     by remember(peakId) { mutableStateOf(false) }

    // Fetch lazily on first flip if not already available.
    LaunchedEffect(peakId) {
        if (resolvedProfile == null || resolvedProfile!!.points.size < 2) {
            runCatching {
                resolvedProfile = com.peakadex.app.AppContainer.apiService.getPeakElevation(peakId).profile
            }.onFailure { e ->
                android.util.Log.w("ElevProfile", "fetch failed for $peakId: ${e.message}")
                fetchFailed = true
            }
        }
    }

    val pts = resolvedProfile?.points?.takeIf { it.size >= 2 }

    if (pts == null) {
        // Show an altitude bar as fallback while loading (or if fetch failed).
        ElevationFallbackBar(altitudeM = altitudeM, modifier = modifier)
        return
    }

    val minElev = resolvedProfile!!.minElevation
    val maxElev = resolvedProfile!!.maxElevation

    Canvas(modifier = modifier) {
        val w     = size.width
        val h     = size.height
        val padX  = 4.dp.toPx()
        val padY  = 6.dp.toPx()
        val range = (maxElev - minElev).coerceAtLeast(1.0)

        fun toX(i: Int)        = padX + (i.toFloat() / (pts.size - 1)) * (w - padX * 2)
        fun toY(elev: Double)  = padY + ((1.0 - (elev - minElev) / range) * (h - padY * 2)).toFloat()

        // Area fill
        val areaPath = Path().apply {
            moveTo(toX(0), h)
            pts.forEachIndexed { i, p -> lineTo(toX(i), toY(p.elevation)) }
            lineTo(toX(pts.size - 1), h)
            close()
        }
        drawPath(areaPath, color = Color.White.copy(alpha = 0.20f))

        // Line
        val linePath = Path().apply {
            pts.forEachIndexed { i, p ->
                if (i == 0) moveTo(toX(i), toY(p.elevation))
                else        lineTo(toX(i), toY(p.elevation))
            }
        }
        drawPath(linePath, color = Color.White,
            style = Stroke(width = 1.5.dp.toPx(), join = StrokeJoin.Round))
    }
}

// Simple altitude bar shown while the profile is loading or when fetch fails.
@Composable
private fun ElevationFallbackBar(altitudeM: Int, modifier: Modifier = Modifier) {
    val pct = (altitudeM / 8849f).coerceIn(0f, 1f)
    Canvas(modifier = modifier) {
        val barH  = 4.dp.toPx()
        val y     = (size.height - barH) / 2
        // Track
        drawRoundRect(
            color        = Color.White.copy(alpha = 0.20f),
            topLeft      = androidx.compose.ui.geometry.Offset(0f, y),
            size         = androidx.compose.ui.geometry.Size(size.width, barH),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(barH / 2),
        )
        // Fill
        if (pct > 0f) {
            drawRoundRect(
                color        = Color.White.copy(alpha = 0.65f),
                topLeft      = androidx.compose.ui.geometry.Offset(0f, y),
                size         = androidx.compose.ui.geometry.Size(size.width * pct, barH),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(barH / 2),
            )
        }
    }
}

// ── Card back ──────────────────────────────────────────────────────────────────

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CardBack(ascent: Ascent, rarity: RarityInfo) {

    // BoxWithConstraints lets us compute heights in dp so the map is exactly 65% of the
    // total card height while keeping the card the same size as before.
    BoxWithConstraints(modifier = Modifier.fillMaxWidth().background(Color.White).padding(7.dp)) {
        // Map box has 3dp horizontal padding on each side → its rendered width:
        val mapWidthDp = maxWidth - 6.dp
        // Current total inner height: map at 4:5 + fixed content below (~140dp)
        val totalH  = mapWidthDp * (5f / 4f) + 140.dp
        val mapH    = totalH * 0.65f

        Column(modifier = Modifier.fillMaxWidth().height(totalH)) {
            Box(
                modifier = Modifier
                    .fillMaxWidth().padding(horizontal = 3.dp)
                    .height(mapH)
                    .clip(RoundedCornerShape(18.dp))
                    .background(Color(0xFF0A1929)),
            ) {
                CardMiniMap(peak = ascent.peak, rarityColor = rarity.color)
                // Bottom gradient — just tall enough to sit above the peak name/profile overlay
                Box(modifier = Modifier.fillMaxWidth().height(160.dp).align(Alignment.BottomStart)
                    .background(Brush.verticalGradient(colorStops = arrayOf(0f to Color.Transparent, 0.4f to Color(0x8007121F), 1f to Color(0xE007121F)))))

                Column(modifier = Modifier.fillMaxWidth().align(Alignment.BottomStart).padding(horizontal = 14.dp, vertical = 14.dp)) {
                    if (!ascent.peak.mountainRange.isNullOrBlank()) {
                        Text(ascent.peak.mountainRange, fontSize = 11.sp, color = Color(0xB3FFFFFF))
                        Spacer(Modifier.height(2.dp))
                    }
                    Text(ascent.peak.name, fontSize = 22.sp, fontWeight = FontWeight.Black, color = Color.White,
                        letterSpacing = (-0.04).em, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text("${ascent.peak.altitudeM} m", fontSize = 28.sp, fontWeight = FontWeight.Black,
                        color = Color.White, letterSpacing = (-0.04).em)
                    Spacer(Modifier.height(8.dp))
                    ElevationProfileCanvas(
                        peakId    = ascent.peak.id,
                        profile   = ascent.peak.elevationProfile,
                        altitudeM = ascent.peak.altitudeM,
                        modifier  = Modifier.fillMaxWidth().height(40.dp),
                    )
                }
            }

            // Stats band — fixed natural height, sits right below the map
            Column(modifier = Modifier.padding(horizontal = 3.dp, vertical = 10.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(5.dp).clip(CircleShape).background(rarity.color))
                    Spacer(Modifier.width(6.dp))
                    Text(stringResource(R.string.logbook_stats_title), fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.07.em, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Spacer(Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    StatBandItem(stringResource(R.string.logbook_stat_ascents),  ascent.peakStats?.totalAscents?.toString()  ?: "—", PeakOnSurface, Modifier.weight(1f))
                    StatBandItem(stringResource(R.string.logbook_stat_climbers), ascent.peakStats?.uniqueClimbers?.toString() ?: "—", PeakOnSurface, Modifier.weight(1f))
                }
            }

            // Footer — cordada pills + description quote. Remaining height is white space.
            Column(modifier = Modifier.padding(horizontal = 3.dp)) {
                // Cordada — one pill per tagged user (shows their username), above the quote.
                if (ascent.persons.isNotEmpty()) {
                    FlowRow(
                        modifier              = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement   = Arrangement.spacedBy(6.dp),
                    ) {
                        Text(
                            stringResource(R.string.card_cordada_label),
                            fontSize   = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color      = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier   = Modifier.align(Alignment.CenterVertically),
                        )
                        ascent.persons.forEach { person ->
                            Text(
                                person.name,
                                fontSize   = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color      = PeakOnSurface,
                                maxLines   = 1,
                                overflow   = TextOverflow.Ellipsis,
                                modifier   = Modifier
                                    .clip(RoundedCornerShape(percent = 50))
                                    .background(rarity.color.copy(alpha = 0.12f))
                                    .padding(horizontal = 9.dp, vertical = 3.dp),
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
                if (!ascent.description.isNullOrBlank()) {
                    // Blockquote — rarity-coloured vertical bar + the user's message.
                    // The message is capped at 100 chars on input (3 lines), so it always
                    // renders in full; ellipsis is only a defensive fallback for legacy data.
                    Row(modifier = Modifier.height(IntrinsicSize.Min)) {
                        Box(
                            modifier = Modifier
                                .width(3.dp)
                                .fillMaxHeight()
                                .clip(RoundedCornerShape(2.dp))
                                .background(rarity.color),
                        )
                        Spacer(Modifier.width(10.dp))
                        Text(
                            ascent.description,
                            fontSize   = 13.sp,
                            color      = PeakMuted,
                            fontStyle  = FontStyle.Italic,
                            maxLines   = 3,
                            overflow   = TextOverflow.Ellipsis,
                            lineHeight = 18.sp,
                        )
                    }
                }
            }
            // Any remaining height → white space (no explicit Spacer needed; Column clips to totalH)
        }
    }
}

// ── States ─────────────────────────────────────────────────────────────────────

@Composable
private fun LogbookFriendsEmptyState() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text      = stringResource(R.string.logbook_friends_empty),
            fontSize  = 14.sp,
            color     = Color(0xFF9CA3AF),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            modifier  = Modifier.padding(horizontal = 32.dp),
        )
    }
}

@Composable
private fun LogbookEmptyState() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text      = stringResource(R.string.logbook_mine_empty),
            fontSize  = 14.sp,
            color     = Color(0xFF9CA3AF),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            modifier  = Modifier.padding(horizontal = 32.dp),
        )
    }
}

@Composable
private fun LogbookNoResultsState() {
    Column(
        Modifier.fillMaxSize().padding(horizontal = 32.dp),
        verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("✿", fontSize = 48.sp, color = PeakBlueActive)
        Spacer(Modifier.height(14.dp))
        Text(stringResource(R.string.logbook_empty_search_title), fontSize = 16.sp, fontWeight = FontWeight.Bold, color = PeakOnSurface)
        Spacer(Modifier.height(4.dp))
        Text(stringResource(R.string.logbook_empty_search_desc), fontSize = 13.sp, color = PeakSubtle,
            lineHeight = 19.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}

@Composable
private fun LogbookLoadingState() {
    val shimmer = rememberSkeletonBrush("cardsSkeleton")

    LazyColumn(
        contentPadding      = PaddingValues(horizontal = 16.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
        modifier            = Modifier.fillMaxSize(),
    ) {
        items(3) {
            CardSkeleton(shimmer)
        }
    }
}

@Composable
private fun CardSkeleton(brush: Brush) {
    Surface(
        modifier        = Modifier
            .fillMaxWidth()
            .shadow(
                elevation     = 8.dp,
                shape         = RoundedCornerShape(28.dp),
                clip          = false,
                ambientColor  = Color(0x1A0D2538),
                spotColor     = Color(0x1A0D2538),
            ),
        shape           = RoundedCornerShape(28.dp),
        color           = Color.White,
        shadowElevation = 0.dp,
    ) {
        Column(Modifier.fillMaxWidth().padding(7.dp)) {
            Row(
                modifier          = Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SkeletonBlock(brush, Modifier.size(32.dp), RoundedCornerShape(16.dp))
                Spacer(Modifier.width(8.dp))
                Column(Modifier.weight(1f)) {
                    SkeletonBlock(brush, Modifier.fillMaxWidth(0.38f).height(13.dp))
                    Spacer(Modifier.height(5.dp))
                    SkeletonBlock(brush, Modifier.width(74.dp).height(11.dp))
                }
                SkeletonBlock(brush, Modifier.size(28.dp), RoundedCornerShape(14.dp))
                Spacer(Modifier.width(2.dp))
                SkeletonBlock(brush, Modifier.size(28.dp), RoundedCornerShape(14.dp))
            }

            Spacer(Modifier.height(2.dp))

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 3.dp)
                    .aspectRatio(4f / 5f)
                    .clip(RoundedCornerShape(18.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
            ) {
                SkeletonBlock(brush, Modifier.fillMaxSize(), RoundedCornerShape(18.dp))
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomStart)
                        .padding(horizontal = 12.dp, vertical = 12.dp),
                ) {
                    SkeletonBlock(brush, Modifier.fillMaxWidth(0.72f).height(26.dp))
                    Spacer(Modifier.height(6.dp))
                    SkeletonBlock(brush, Modifier.fillMaxWidth(0.48f).height(13.dp))
                    Spacer(Modifier.height(5.dp))
                    SkeletonBlock(brush, Modifier.fillMaxWidth(0.56f).height(10.dp))
                }
            }

            Spacer(Modifier.height(6.dp))

            Row(
                modifier              = Modifier.fillMaxWidth().padding(horizontal = 3.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                repeat(3) {
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0xFFF8FAFC))
                            .padding(horizontal = 8.dp, vertical = 6.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        SkeletonBlock(brush, Modifier.fillMaxWidth(0.62f).height(9.dp))
                        Spacer(Modifier.height(4.dp))
                        SkeletonBlock(brush, Modifier.fillMaxWidth(0.74f).height(12.dp))
                    }
                }
            }

            Spacer(Modifier.height(3.dp))
        }
    }
}

@Composable
private fun LogbookErrorState(message: String, onRetry: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text("⚠️", fontSize = 40.sp)
        Spacer(Modifier.height(12.dp))
        Text(message, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(16.dp))
        Button(onClick = onRetry, colors = ButtonDefaults.buttonColors(containerColor = PeakGreenCTA)) { Text(stringResource(R.string.action_retry)) }
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// ── Tab icons ─────────────────────────────────────────────────────────────────

/** Single person — head circle + shoulder arc */
private val SoloPersonIcon: ImageVector by lazy {
    ImageVector.Builder(
        name            = "SoloPerson",
        defaultWidth    = 24.dp,
        defaultHeight   = 24.dp,
        viewportWidth   = 24f,
        viewportHeight  = 24f,
    ).apply {
        // Head
        path(
            stroke            = SolidColor(Color.Black),
            strokeLineWidth   = 1.8f,
            strokeLineCap     = StrokeCap.Round,
            strokeLineJoin    = StrokeJoin.Round,
            fill              = SolidColor(Color.Transparent),
        ) {
            // Circle cx=12 cy=7 r=3.5 approximated as bezier
            moveTo(12f, 3.5f)
            curveTo(14.0f, 3.5f, 15.5f, 5.0f, 15.5f, 7.0f)
            curveTo(15.5f, 9.0f, 14.0f, 10.5f, 12f, 10.5f)
            curveTo(10.0f, 10.5f, 8.5f, 9.0f, 8.5f, 7.0f)
            curveTo(8.5f, 5.0f, 10.0f, 3.5f, 12f, 3.5f)
            close()
        }
        // Body arc: M5 20 c0-3.866 3.134-7 7-7 s7 3.134 7 7
        path(
            stroke          = SolidColor(Color.Black),
            strokeLineWidth = 1.8f,
            strokeLineCap   = StrokeCap.Round,
            strokeLineJoin  = StrokeJoin.Round,
            fill            = SolidColor(Color.Transparent),
        ) {
            moveTo(5f, 20f)
            curveTo(5f, 16.134f, 8.134f, 13f, 12f, 13f)
            curveTo(15.866f, 13f, 19f, 16.134f, 19f, 20f)
        }
    }.build()
}

/** Two people linked by a rope — cordada */
private val CordadaIcon: ImageVector by lazy {
    ImageVector.Builder(
        name           = "Cordada",
        defaultWidth   = 24.dp,
        defaultHeight  = 24.dp,
        viewportWidth  = 24f,
        viewportHeight = 24f,
    ).apply {
        // Left head (cx=7.5, cy=6, r=2.8)
        path(
            stroke          = SolidColor(Color.Black),
            strokeLineWidth = 1.8f,
            strokeLineCap   = StrokeCap.Round,
            strokeLineJoin  = StrokeJoin.Round,
            fill            = SolidColor(Color.Transparent),
        ) {
            moveTo(7.5f, 3.2f)
            curveTo(9.05f, 3.2f, 10.3f, 4.45f, 10.3f, 6f)
            curveTo(10.3f, 7.55f, 9.05f, 8.8f, 7.5f, 8.8f)
            curveTo(5.95f, 8.8f, 4.7f, 7.55f, 4.7f, 6f)
            curveTo(4.7f, 4.45f, 5.95f, 3.2f, 7.5f, 3.2f)
            close()
        }
        // Left body arc
        path(
            stroke          = SolidColor(Color.Black),
            strokeLineWidth = 1.8f,
            strokeLineCap   = StrokeCap.Round,
            fill            = SolidColor(Color.Transparent),
        ) {
            moveTo(2f, 19f)
            curveTo(2f, 15.962f, 4.462f, 13.5f, 7.5f, 13.5f)
        }
        // Right head (cx=16.5, cy=6, r=2.8)
        path(
            stroke          = SolidColor(Color.Black),
            strokeLineWidth = 1.8f,
            strokeLineCap   = StrokeCap.Round,
            strokeLineJoin  = StrokeJoin.Round,
            fill            = SolidColor(Color.Transparent),
        ) {
            moveTo(16.5f, 3.2f)
            curveTo(18.05f, 3.2f, 19.3f, 4.45f, 19.3f, 6f)
            curveTo(19.3f, 7.55f, 18.05f, 8.8f, 16.5f, 8.8f)
            curveTo(14.95f, 8.8f, 13.7f, 7.55f, 13.7f, 6f)
            curveTo(13.7f, 4.45f, 14.95f, 3.2f, 16.5f, 3.2f)
            close()
        }
        // Right body arc
        path(
            stroke          = SolidColor(Color.Black),
            strokeLineWidth = 1.8f,
            strokeLineCap   = StrokeCap.Round,
            fill            = SolidColor(Color.Transparent),
        ) {
            moveTo(22f, 19f)
            curveTo(22f, 15.962f, 19.538f, 13.5f, 16.5f, 13.5f)
        }
        // Rope — dash 1: 7.5→9.5
        path(
            stroke          = SolidColor(Color.Black),
            strokeLineWidth = 1.8f,
            strokeLineCap   = StrokeCap.Round,
            fill            = SolidColor(Color.Transparent),
        ) { moveTo(7.5f, 13.5f); lineTo(9.5f, 13.5f) }
        // Rope — dash 2: 11→13
        path(
            stroke          = SolidColor(Color.Black),
            strokeLineWidth = 1.8f,
            strokeLineCap   = StrokeCap.Round,
            fill            = SolidColor(Color.Transparent),
        ) { moveTo(11f, 13.5f); lineTo(13f, 13.5f) }
        // Rope — dash 3: 14.5→16.5
        path(
            stroke          = SolidColor(Color.Black),
            strokeLineWidth = 1.8f,
            strokeLineCap   = StrokeCap.Round,
            fill            = SolidColor(Color.Transparent),
        ) { moveTo(14.5f, 13.5f); lineTo(16.5f, 13.5f) }
    }.build()
}

internal fun formatDate(isoDate: String): String {
    return try {
        val local = if (isoDate.length > 10) LocalDate.parse(isoDate.substring(0, 10)) else LocalDate.parse(isoDate)
        val day   = local.dayOfMonth
        val month = local.month.getDisplayName(TextStyle.SHORT, Locale.getDefault()).lowercase().trimEnd('.')
        "$day $month. ${local.year}"
    } catch (e: Exception) {
        isoDate.take(10)
    }
}

package com.peakadex.app.feature.logbook

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import android.content.Intent
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull
import androidx.compose.runtime.snapshotFlow
import coil3.compose.AsyncImage
import com.peakadex.app.core.model.Ascent
import com.peakadex.app.core.ui.theme.PeakBlueActive
import com.peakadex.app.core.ui.theme.PeakBorderLight
import com.peakadex.app.core.ui.theme.PeakGreenCTA
import com.peakadex.app.core.ui.theme.PeakLayerActiveBg
import com.peakadex.app.core.ui.theme.PeakMuted
import com.peakadex.app.core.ui.theme.PeakNavyLight
import com.peakadex.app.core.ui.theme.PeakOnSurface
import com.peakadex.app.core.ui.theme.PeakSubtle
import com.peakadex.app.core.ui.theme.PeakSurfaceAlt
import com.peakadex.app.core.ui.theme.PeakSlate
import com.peakadex.app.core.ui.theme.PeakSurfaceVariant
import com.peakadex.app.core.ui.theme.PeakTextHeadline
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.ln
import kotlin.math.tan

// ── Rarity display definitions (UI only — filter logic lives in LogbookFilter) ─

private data class RarityDef(
    val id:     String,
    val label:  String,
    val color:  Color,
    val minAlt: Int,
    val ep:     Int,
)

private val RARITIES = listOf(
    RarityDef("daisy",      "Daisy",      Color(0xFF00995C), 0,    10),
    RarityDef("heather",    "Heather",    Color(0xFF06B6D4), 1000, 20),
    RarityDef("gentian",    "Gentian",    Color(0xFF1E40AF), 2000, 30),
    RarityDef("tundra",     "Tundra",     Color(0xFF0E7490), 3000, 60),
    RarityDef("edelweiss",  "Edelweiss",  Color(0xFFA855F7), 4000, 120),
    RarityDef("draba",      "Draba",      Color(0xFFEC4899), 5000, 250),
    RarityDef("saxifrage",  "Saxifrage",  Color(0xFFF97316), 6000, 500),
    RarityDef("cinquefoil", "Cinquefoil", Color(0xFFEAB308), 7000, 1000),
    RarityDef("snow_lotus", "Snow Lotus", PeakNavyLight, 8000, 2000),
)

private fun getRarityDef(altitudeM: Int): RarityDef =
    RARITIES.lastOrNull { altitudeM >= it.minAlt } ?: RARITIES.first()

// Calculates a Carto Dark Matter tile URL for the given coordinates at zoom 10.
// dark_matter style = dark background + light labels, matches the card's dark aesthetic.
// Zoom 10 ≈ 35 km × 35 km per tile — shows the surrounding region, not just the summit.
private fun peakTileUrl(lat: Double, lon: Double, zoom: Int = 10): String {
    val n     = 1 shl zoom   // 2^zoom
    val xTile = ((lon + 180.0) / 360.0 * n).toInt().coerceIn(0, n - 1)
    val latRad = Math.toRadians(lat)
    val yTile = ((1.0 - ln(tan(latRad) + 1.0 / cos(latRad)) / PI) / 2.0 * n).toInt().coerceIn(0, n - 1)
    return "https://a.basemaps.cartocdn.com/dark_matter/$zoom/$xTile/$yTile.png"
}

// ── Custom icons ───────────────────────────────────────────────────────────────

private val SearchIcon: ImageVector by lazy {
    ImageVector.Builder("Search", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round, fill = null) {
            moveTo(19f, 11f)
            arcTo(8f, 8f, 0f, false, true, 3f, 11f)
            arcTo(8f, 8f, 0f, false, true, 19f, 11f)
            close()
        }
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 2.2f, strokeLineCap = StrokeCap.Round) {
            moveTo(16.65f, 16.65f); lineTo(21f, 21f)
        }
    }.build()
}

private val FiltersIcon: ImageVector by lazy {
    ImageVector.Builder("Filters", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 1.8f, strokeLineCap = StrokeCap.Round) { moveTo(2f, 5f); lineTo(22f, 5f) }
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 1.8f, strokeLineCap = StrokeCap.Round) { moveTo(5f, 12f); lineTo(19f, 12f) }
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 1.8f, strokeLineCap = StrokeCap.Round) { moveTo(8f, 19f); lineTo(16f, 19f) }
    }.build()
}

private val CloseSmallIcon: ImageVector by lazy {
    ImageVector.Builder("CloseSmall", 16.dp, 16.dp, 16f, 16f).apply {
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 1.8f, strokeLineCap = StrokeCap.Round) { moveTo(12f, 4f); lineTo(4f, 12f) }
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 1.8f, strokeLineCap = StrokeCap.Round) { moveTo(4f, 4f); lineTo(12f, 12f) }
    }.build()
}

// Share icon — 3 nodes connected by lines (matches web AscentCard)
private val ShareNetworkIcon: ImageVector by lazy {
    ImageVector.Builder("ShareNetwork", 20.dp, 20.dp, 20f, 20f).apply {
        // Top-right circle (cx=16, cy=4, r=2) → fill
        path(fill = SolidColor(Color.Black), stroke = SolidColor(Color.Black), strokeLineWidth = 1.4f) {
            moveTo(18f, 4f); arcTo(2f, 2f, 0f, false, true, 14f, 4f); arcTo(2f, 2f, 0f, false, true, 18f, 4f); close()
        }
        // Left circle (cx=4, cy=10, r=2)
        path(fill = SolidColor(Color.Black), stroke = SolidColor(Color.Black), strokeLineWidth = 1.4f) {
            moveTo(6f, 10f); arcTo(2f, 2f, 0f, false, true, 2f, 10f); arcTo(2f, 2f, 0f, false, true, 6f, 10f); close()
        }
        // Bottom-right circle (cx=16, cy=16, r=2)
        path(fill = SolidColor(Color.Black), stroke = SolidColor(Color.Black), strokeLineWidth = 1.4f) {
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

// Pencil / edit icon (matches web AscentCard)
private val PencilIcon: ImageVector by lazy {
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

// ── Active chip model (UI only) ────────────────────────────────────────────────

private data class ActiveChip(
    val key:         String,
    val label:       String,
    val bgColor:     Color,
    val borderColor: Color,
    val textColor:   Color,
)

private fun buildActiveChips(filters: LogbookFilterState): List<ActiveChip> = buildList {
    // Peak filter from Atlas navigation — shown first, clears all other filters on dismiss
    if (filters.peakId != null) {
        add(ActiveChip("peak", "🏔 ${filters.peakName ?: filters.peakId}", Color(0xFFF0F9FF), Color(0xFF7DD3FC), Color(0xFF0369A1)))
        return@buildList  // peak filter is exclusive — don't show other chips simultaneously
    }
    // Friends is the default — no chip. Only show a chip when the user has deviated from it.
    when (filters.viewFilter) {
        ViewFilter.All     -> add(ActiveChip("view", "👁 Todos",      PeakLayerActiveBg, Color(0xFFBFDBFE), Color(0xFF1D4ED8)))
        ViewFilter.Mine    -> add(ActiveChip("view", "👤 Mis cimas",  PeakLayerActiveBg, Color(0xFFBFDBFE), Color(0xFF1D4ED8)))
        ViewFilter.Friends -> Unit  // default — no chip
    }
    if (filters.mythic) {
        add(ActiveChip("rarity", "⭐ Mythic", Color(0xFFFFFBEB), Color(0xFFF59E0B), Color(0xFF92400E)))
    } else if (filters.rarityId != null) {
        val r = RARITIES.find { it.id == filters.rarityId }
        if (r != null) add(ActiveChip("rarity", "✿ ${r.label}", r.color.copy(alpha = 0.12f), r.color.copy(alpha = 0.35f), r.color))
    }
    when (filters.timeRange) {
        TimeRange.Month -> add(ActiveChip("time", "📅 Último mes",           PeakSurfaceVariant, PeakBorderLight, PeakOnSurface))
        TimeRange.Year  -> add(ActiveChip("time", "📅 ${LocalDate.now().year}", PeakSurfaceVariant, PeakBorderLight, PeakOnSurface))
        TimeRange.All   -> Unit
    }
    if (filters.sort == SortOrder.ElevDesc) {
        add(ActiveChip("sort", "⛰ Mayor altitud", Color(0xFFF0FDF4), Color(0xFFBBF7D0), Color(0xFF15803D)))
    }
}

// ── Entry point ────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LogbookScreen(
    onAscentClick: (String) -> Unit,
    initialPeakId:   String? = null,
    initialPeakName: String? = null,
    onPeakIdConsumed: () -> Unit = {},
    refreshTrigger: Int = 0,
    highlightId: String? = null,
    onHighlightConsumed: () -> Unit = {},
    vm: LogbookViewModel = viewModel(),
) {
    // Apply peak filter from Atlas navigation once, then signal consumed so the
    // caller can clear the pending state (prevents re-applying on recomposition).
    LaunchedEffect(initialPeakId) {
        if (initialPeakId != null) {
            vm.setPeakFilter(initialPeakId, initialPeakName)
            onPeakIdConsumed()
        }
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

    var filtersOpen by remember { mutableStateOf(false) }

    val activeChips = remember(filters) { buildActiveChips(filters) }

    val context = LocalContext.current
    val onShareClick: (String) -> Unit = { ascentId ->
        // Make the ascent public (fire-and-forget — non-critical)
        vm.shareAscent(ascentId)
        // Launch Android system share sheet
        val url = "https://www.peakadex.com/ascent/$ascentId"
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, url)
        }
        context.startActivity(Intent.createChooser(intent, null))
    }

    Column(modifier = Modifier.fillMaxSize()) {

        SearchAndFilterBar(
            search         = filters.search,
            onSearchChange = vm::setSearch,
            isDirty        = filters.isDirty,
            filtersOpen    = filtersOpen,
            onFiltersClick = { filtersOpen = true },
        )

        if (activeChips.isNotEmpty()) {
            ActiveChipsRow(
                chips       = activeChips,
                onClearChip = { key ->
                    when (key) {
                        "peak"   -> vm.setPeakFilter(null, null)
                        "view"   -> vm.setViewFilter(ViewFilter.Friends)  // back to default
                        "rarity" -> { vm.setRarityId(null); vm.setMythic(false) }
                        "time"   -> vm.setTimeRange(TimeRange.All)
                        "sort"   -> vm.setSort(SortOrder.DateDesc)
                    }
                },
            )
        }

        when (uiState) {
            is LogbookUiState.Loading -> LogbookLoadingState()
            is LogbookUiState.Error   -> LogbookErrorState((uiState as LogbookUiState.Error).message) { vm.load() }
            is LogbookUiState.Success -> PullToRefreshBox(
                isRefreshing = isRefreshing,
                onRefresh    = { vm.refresh() },
                modifier     = Modifier.fillMaxSize(),
            ) {
                when {
                    filteredAscents.isEmpty() && filters.search.isBlank() && !filters.isDirty ->
                        // Default state: Friends view, no data
                        LogbookFriendsEmptyState()
                    filteredAscents.isEmpty() && filters.viewFilter == ViewFilter.Mine &&
                        filters.search.isBlank() && filters.rarityId == null && !filters.mythic &&
                        filters.timeRange == TimeRange.All ->
                        LogbookEmptyState()
                    filteredAscents.isEmpty() ->
                        LogbookNoResultsState()
                    else ->
                        LogbookList(
                            ascents             = filteredAscents,
                            onAscentClick       = onAscentClick,
                            onShareClick        = onShareClick,
                            listState           = listState,
                            highlightId         = highlightId,
                            onHighlightConsumed = onHighlightConsumed,
                        )
                }
            }
        }
    }

    if (filtersOpen) {
        FilterBottomSheet(
            filters        = filters,
            resultCount    = filteredAscents.size,
            onSetViewFilter = vm::setViewFilter,
            onSetRarityId  = vm::setRarityId,
            onSetMythic    = vm::setMythic,
            onSetTimeRange = vm::setTimeRange,
            onSetSort      = vm::setSort,
            onClearAll     = vm::clearFilters,
            onDismiss      = { filtersOpen = false },
        )
    }
}

// ── Search + filter bar ────────────────────────────────────────────────────────

@Composable
private fun SearchAndFilterBar(
    search:         String,
    onSearchChange: (String) -> Unit,
    isDirty:        Boolean,
    filtersOpen:    Boolean,
    onFiltersClick: () -> Unit,
) {
    val focusManager = LocalFocusManager.current

    Row(
        modifier              = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment     = Alignment.CenterVertically,
    ) {
        // Search pill
        Row(
            modifier = Modifier
                .weight(1f)
                .shadow(3.dp, RoundedCornerShape(28.dp))
                .background(Color.White, RoundedCornerShape(28.dp))
                .padding(horizontal = 14.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(SearchIcon, null, Modifier.size(18.dp), tint = PeakNavyLight)
            Spacer(Modifier.width(6.dp))
            OutlinedTextField(
                value         = search,
                onValueChange = onSearchChange,
                placeholder   = { Text("Busca cimas, rutas...", fontSize = 15.sp, color = PeakNavyLight) },
                trailingIcon  = if (search.isNotEmpty()) {
                    { IconButton(onClick = { onSearchChange("") }) { Icon(CloseSmallIcon, null, Modifier.size(16.dp), tint = PeakSubtle) } }
                } else null,
                singleLine      = true,
                modifier        = Modifier.weight(1f),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text, imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
                colors          = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor      = Color.Transparent,
                    unfocusedBorderColor    = Color.Transparent,
                    focusedContainerColor   = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                ),
                textStyle = LocalTextStyle.current.copy(fontSize = 15.sp, color = PeakTextHeadline),
            )
        }

        // Filtros pill button
        val filtersActive = isDirty || filtersOpen
        Box {
            Row(
                modifier = Modifier
                    .height(56.dp)
                    .shadow(3.dp, RoundedCornerShape(28.dp))
                    .background(
                        if (filtersActive) PeakSlate else Color.White,
                        RoundedCornerShape(28.dp),
                    )
                    .clickable(onClick = onFiltersClick)
                    .padding(horizontal = 16.dp),
                verticalAlignment     = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(
                    FiltersIcon, null, Modifier.size(16.dp),
                    tint = if (filtersActive) Color.White else PeakSlate,
                )
                Text(
                    "Filtros", fontSize = 13.sp, fontWeight = FontWeight.Bold,
                    color = if (filtersActive) Color.White else PeakSlate,
                )
            }
            if (isDirty && !filtersOpen) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .align(Alignment.TopEnd)
                        .offset(x = 2.dp, y = (-2).dp)
                        .background(PeakBlueActive, CircleShape),
                )
            }
        }
    }
}

// ── Active filter chips — Material3 InputChip ─────────────────────────────────

@Composable
private fun ActiveChipsRow(chips: List<ActiveChip>, onClearChip: (String) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(start = 16.dp, end = 16.dp, bottom = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        chips.forEach { chip ->
            InputChip(
                selected      = true,
                onClick       = { onClearChip(chip.key) },
                label         = { Text(chip.label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold) },
                trailingIcon  = { Icon(CloseSmallIcon, "Quitar filtro", Modifier.size(14.dp), tint = chip.textColor) },
                colors        = InputChipDefaults.inputChipColors(
                    selectedContainerColor = chip.bgColor,
                    selectedLabelColor     = chip.textColor,
                ),
                border = InputChipDefaults.inputChipBorder(
                    enabled             = true,
                    selected            = true,
                    selectedBorderColor = chip.borderColor,
                    selectedBorderWidth = 1.dp,
                ),
            )
        }
    }
}

// ── Filter bottom sheet — Material3 FilterChip ────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun FilterBottomSheet(
    filters:         LogbookFilterState,
    resultCount:     Int,
    onSetViewFilter: (ViewFilter) -> Unit,
    onSetRarityId:   (String?) -> Unit,
    onSetMythic:     (Boolean) -> Unit,
    onSetTimeRange:  (TimeRange) -> Unit,
    onSetSort:       (SortOrder) -> Unit,
    onClearAll:      () -> Unit,
    onDismiss:       () -> Unit,
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState       = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor   = Color.White,
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

            // Header
            Row(
                modifier              = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment     = Alignment.CenterVertically,
            ) {
                Text("Filtros", fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, color = PeakTextHeadline)
                if (filters.isDirty) {
                    TextButton(onClick = onClearAll) {
                        Text("Limpiar todo", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = PeakBlueActive)
                    }
                } else {
                    IconButton(onClick = onDismiss) {
                        Icon(CloseSmallIcon, null, Modifier.size(20.dp), tint = PeakSubtle)
                    }
                }
            }

            HorizontalDivider(color = PeakBorderLight)

            // Scrollable body
            Column(
                modifier            = Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 18.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp),
            ) {

                // ── EXPLORAR ───────────────────────────────────────────────────
                FilterSection("EXPLORAR") {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(
                            ViewFilter.All     to "Todos",
                            ViewFilter.Mine    to "Mis cimas",
                            ViewFilter.Friends to "Amigos",
                        ).forEach { (view, label) ->
                            FilterChip(
                                selected = filters.viewFilter == view,
                                onClick  = { onSetViewFilter(view) },
                                label    = { Text(label, fontSize = 13.sp) },
                                colors   = filterChipColors(),
                                border   = filterChipBorder(filters.viewFilter == view),
                            )
                        }
                    }
                }

                // ── RAREZA ──────────────────────────────────────────────────────
                FilterSection("RAREZA") {
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement   = Arrangement.spacedBy(8.dp),
                    ) {
                        FilterChip(
                            selected = filters.rarityId == null && !filters.mythic,
                            onClick  = { onSetRarityId(null); onSetMythic(false) },
                            label    = { Text("Todas", fontSize = 13.sp) },
                            colors   = filterChipColors(),
                            border   = filterChipBorder(filters.rarityId == null && !filters.mythic),
                        )
                        RARITIES.forEach { r ->
                            val selected = !filters.mythic && filters.rarityId == r.id
                            FilterChip(
                                selected = selected,
                                onClick  = { onSetMythic(false); onSetRarityId(if (selected) null else r.id) },
                                label    = { Text("✿", fontSize = 15.sp, color = r.color.copy(alpha = if (selected) 1f else 0.5f)) },
                                colors   = FilterChipDefaults.filterChipColors(
                                    containerColor         = r.color.copy(alpha = 0.07f),
                                    labelColor             = r.color.copy(alpha = 0.5f),
                                    selectedContainerColor = r.color.copy(alpha = 0.15f),
                                    selectedLabelColor     = r.color,
                                ),
                                border   = BorderStroke(1.5.dp, if (selected) r.color else r.color.copy(alpha = 0.3f)),
                            )
                        }
                        FilterChip(
                            selected = filters.mythic,
                            onClick  = { onSetMythic(!filters.mythic); onSetRarityId(null) },
                            label    = { Text("⭐ Mythic", fontSize = 13.sp) },
                            colors   = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Color(0xFFFFFBEB),
                                selectedLabelColor     = Color(0xFF92400E),
                            ),
                            border = BorderStroke(1.5.dp, if (filters.mythic) Color(0xFFF59E0B) else PeakBorderLight),
                        )
                    }
                }

                // ── CUÁNDO ─────────────────────────────────────────────────────
                FilterSection("CUÁNDO") {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(
                            TimeRange.Month to "Último mes",
                            TimeRange.Year  to "Este año",
                            TimeRange.All   to "Siempre",
                        ).forEach { (range, label) ->
                            FilterChip(
                                selected = filters.timeRange == range,
                                onClick  = { onSetTimeRange(range) },
                                label    = { Text(label, fontSize = 13.sp) },
                                colors   = filterChipColors(),
                                border   = filterChipBorder(filters.timeRange == range),
                            )
                        }
                    }
                }

                // ── ORDENAR POR ────────────────────────────────────────────────
                FilterSection("ORDENAR POR") {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = filters.sort == SortOrder.DateDesc,
                            onClick  = { onSetSort(SortOrder.DateDesc) },
                            label    = { Text("Más reciente", fontSize = 13.sp) },
                            colors   = filterChipColors(),
                            border   = filterChipBorder(filters.sort == SortOrder.DateDesc),
                        )
                        FilterChip(
                            selected = filters.sort == SortOrder.ElevDesc,
                            onClick  = { onSetSort(SortOrder.ElevDesc) },
                            label    = { Text("Mayor altitud", fontSize = 13.sp) },
                            colors   = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = PeakLayerActiveBg,
                                selectedLabelColor     = Color(0xFF1D4ED8),
                            ),
                            border = BorderStroke(1.5.dp, if (filters.sort == SortOrder.ElevDesc) Color(0xFFBFDBFE) else PeakBorderLight),
                        )
                    }
                }

                Spacer(Modifier.height(4.dp))
            }

            HorizontalDivider(color = PeakBorderLight)

            // Footer CTA
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
                        "Ver $resultCount resultado${if (resultCount != 1) "s" else ""}",
                        fontSize = 15.sp, fontWeight = FontWeight.ExtraBold,
                    )
                }
            }
        }
    }
}

@Composable
private fun FilterSection(title: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(title, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.sp, color = PeakSubtle)
        content()
    }
}

// Shared FilterChip color/border helpers for the default blue style
@Composable
private fun filterChipColors() = FilterChipDefaults.filterChipColors(
    containerColor         = PeakSurfaceAlt,
    labelColor             = PeakMuted,
    selectedContainerColor = PeakLayerActiveBg,
    selectedLabelColor     = PeakBlueActive,
)

@Composable
private fun filterChipBorder(selected: Boolean) =
    BorderStroke(1.5.dp, if (selected) PeakBlueActive else PeakBorderLight)

// ── List ───────────────────────────────────────────────────────────────────────

@Composable
private fun LogbookList(
    ascents: List<Ascent>,
    onAscentClick: (String) -> Unit,
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
                onDetailClick = { onAscentClick(ascent.id) },
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
    onDetailClick: () -> Unit,
    onShareClick:  () -> Unit,
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
    val rarity  = getRarityDef(ascent.peak.altitudeM)

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
                    ascent        = ascent,
                    rarity        = rarity,
                    onDetailClick = onDetailClick,
                    onShareClick  = onShareClick,
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
private fun CardFront(
    ascent:       Ascent,
    rarity:       RarityDef,
    onDetailClick: () -> Unit,
    onShareClick:  () -> Unit,
) {
    val heroUrl  = ascent.photos.firstOrNull()?.url
    val userName = ascent.user?.name ?: "Tú"
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
                            contentDescription = "Compartir",
                            modifier           = Modifier.size(16.dp),
                            tint               = PeakSubtle,
                        )
                    }
                    IconButton(
                        onClick   = onDetailClick,
                        modifier  = Modifier.size(28.dp),
                    ) {
                        Icon(
                            imageVector        = PencilIcon,
                            contentDescription = "Editar",
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
            StatBandItem("RAREZA",  "✿ ${rarity.label}", rarity.color,       Modifier.weight(1f))
            StatBandItem("ALTITUD", "${ascent.peak.altitudeM} m", PeakOnSurface, Modifier.weight(1f))
            StatBandItem("EP",      "+${rarity.ep}",     rarity.color,       Modifier.weight(1f))
        }
        Spacer(Modifier.height(3.dp))
    }
}

@Composable
private fun StatBandItem(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.clip(RoundedCornerShape(8.dp)).background(Color(0xFFF8FAFC)).padding(horizontal = 8.dp, vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(label, fontSize = 9.sp, fontWeight = FontWeight.Black, letterSpacing = 0.09.em, color = Color(0xFF8A94A3))
        Spacer(Modifier.height(2.dp))
        Text(value, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = color, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

// ── Card back ──────────────────────────────────────────────────────────────────

@Composable
private fun CardBack(ascent: Ascent, rarity: RarityDef) {
    val barFraction = (ascent.peak.altitudeM.toFloat() / 8849).coerceIn(0f, 1f)
    val bylineName  = ascent.user?.name ?: "Tú"

    Column(modifier = Modifier.fillMaxWidth().background(Color.White).padding(7.dp)) {
        val tileUrl = remember(ascent.peak.latitude, ascent.peak.longitude) {
            peakTileUrl(ascent.peak.latitude, ascent.peak.longitude)
        }
        Box(
            modifier = Modifier
                .fillMaxWidth().padding(horizontal = 3.dp).aspectRatio(4f / 5f)
                .clip(RoundedCornerShape(18.dp))
                .background(Color(0xFF0A1929)),
        ) {
            AsyncImage(
                model              = tileUrl,
                contentDescription = null,
                contentScale       = ContentScale.Crop,
                modifier           = Modifier.fillMaxSize(),
                onLoading  = { android.util.Log.d("CardBack", "LOADING tile: $tileUrl") },
                onSuccess  = { android.util.Log.d("CardBack", "SUCCESS tile: $tileUrl") },
                onError    = { android.util.Log.e("CardBack", "ERROR tile: $tileUrl — ${it.result.throwable?.message}") },
            )
            // Bottom gradient for peak name / altitude readability (tile is already dark so overlay is subtle)
            Box(modifier = Modifier.fillMaxWidth().fillMaxHeight(0.6f).align(Alignment.BottomStart)
                .background(Brush.verticalGradient(colorStops = arrayOf(0f to Color.Transparent, 0.4f to Color(0x8007121F), 1f to Color(0xE007121F)))))

            Text("${"%.4f".format(ascent.peak.latitude)}, ${"%.4f".format(ascent.peak.longitude)}",
                fontSize = 10.sp, color = Color(0xB3FFFFFF),
                modifier = Modifier.align(Alignment.TopEnd).padding(12.dp))

            Column(modifier = Modifier.fillMaxWidth().align(Alignment.BottomStart).padding(horizontal = 14.dp, vertical = 14.dp)) {
                if (!ascent.peak.mountainRange.isNullOrBlank()) {
                    Text(ascent.peak.mountainRange, fontSize = 11.sp, color = Color(0xB3FFFFFF))
                    Spacer(Modifier.height(2.dp))
                }
                Text(ascent.peak.name, fontSize = 22.sp, fontWeight = FontWeight.Black, color = Color.White,
                    letterSpacing = (-0.04).em, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("${ascent.peak.altitudeM} m", fontSize = 28.sp, fontWeight = FontWeight.Black,
                    color = Color.White, letterSpacing = (-0.04).em)
                Spacer(Modifier.height(10.dp))
                Box(modifier = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(999.dp)).background(Color(0x40FFFFFF))) {
                    Box(modifier = Modifier.fillMaxHeight().fillMaxWidth(barFraction).clip(RoundedCornerShape(999.dp)).background(rarity.color))
                }
            }
        }

        Spacer(Modifier.height(10.dp))

        Column(modifier = Modifier.padding(horizontal = 3.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.size(5.dp).clip(CircleShape).background(rarity.color))
                Spacer(Modifier.width(6.dp))
                Text("ESTADÍSTICAS PEAKADEX", fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.07.em, color = PeakNavyLight)
            }
            Spacer(Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                StatBandItem("ASCENSIONES", "—", PeakOnSurface, Modifier.weight(1f))
                StatBandItem("ALPINISTAS",  "—", PeakOnSurface, Modifier.weight(1f))
            }
        }

        Spacer(Modifier.height(10.dp))

        Column(modifier = Modifier.padding(horizontal = 3.dp)) {
            val personsText = when {
                ascent.persons.isEmpty() -> null
                ascent.persons.size == 1 -> "con ${ascent.persons[0].name}"
                else -> buildString {
                    append("con ")
                    ascent.persons.dropLast(1).forEachIndexed { i, p -> if (i > 0) append(", "); append(p.name) }
                    append(" y ${ascent.persons.last().name}")
                }
            }
            if (personsText != null) {
                Text(
                    buildAnnotatedString {
                        withStyle(SpanStyle(fontWeight = FontWeight.ExtraBold, color = PeakTextHeadline)) { append(bylineName) }
                        append(" $personsText")
                    },
                    fontSize = 13.sp, color = PeakOnSurface, maxLines = 2, overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(4.dp))
            }
            if (!ascent.description.isNullOrBlank()) {
                Text(ascent.description, fontSize = 13.sp, color = PeakMuted, maxLines = 2, overflow = TextOverflow.Ellipsis, lineHeight = 19.sp)
            }
        }
        Spacer(Modifier.height(3.dp))
    }
}

// ── States ─────────────────────────────────────────────────────────────────────

@Composable
private fun LogbookFriendsEmptyState() {
    Column(
        Modifier.fillMaxSize().padding(horizontal = 32.dp),
        verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("👥", fontSize = 52.sp)
        Spacer(Modifier.height(16.dp))
        Text("Sin actividad de amigos", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = PeakTextHeadline)
        Spacer(Modifier.height(6.dp))
        Text("Cuando tus amigos registren cimas aparecerán aquí.\nUsa el filtro para ver tus propias ascensiones.", fontSize = 14.sp, color = PeakMuted, lineHeight = 20.sp,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}

@Composable
private fun LogbookEmptyState() {
    Column(
        Modifier.fillMaxSize().padding(horizontal = 32.dp),
        verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("🏔️", fontSize = 52.sp)
        Spacer(Modifier.height(16.dp))
        Text("Tu bitácora está vacía", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = PeakTextHeadline)
        Spacer(Modifier.height(6.dp))
        Text("Registra tu primera ascensión para empezar.", fontSize = 14.sp, color = PeakMuted, lineHeight = 20.sp,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center)
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
        Text("Sin resultados", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = PeakOnSurface)
        Spacer(Modifier.height(4.dp))
        Text("Prueba a ajustar la búsqueda o los filtros.", fontSize = 13.sp, color = PeakSubtle,
            lineHeight = 19.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}

@Composable
private fun LogbookLoadingState() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = PeakBlueActive) }
}

@Composable
private fun LogbookErrorState(message: String, onRetry: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text("⚠️", fontSize = 40.sp)
        Spacer(Modifier.height(12.dp))
        Text(message, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(16.dp))
        Button(onClick = onRetry, colors = ButtonDefaults.buttonColors(containerColor = PeakBlueActive)) { Text("Reintentar") }
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

internal fun formatDate(isoDate: String): String {
    return try {
        val local = if (isoDate.length > 10) LocalDate.parse(isoDate.substring(0, 10)) else LocalDate.parse(isoDate)
        val day   = local.dayOfMonth
        val month = local.month.getDisplayName(TextStyle.SHORT, Locale.forLanguageTag("es")).lowercase().trimEnd('.')
        "$day $month. ${local.year}"
    } catch (e: Exception) {
        isoDate.take(10)
    }
}

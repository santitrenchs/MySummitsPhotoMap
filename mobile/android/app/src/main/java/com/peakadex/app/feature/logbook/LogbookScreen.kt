package com.peakadex.app.feature.logbook

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
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
import com.peakadex.app.core.ui.theme.PeakMuted
import com.peakadex.app.core.ui.RarityInfo
import com.peakadex.app.core.ui.RARITY_PALETTE
import com.peakadex.app.core.ui.rarityForAltitude
import com.peakadex.app.core.ui.theme.PeakOnSurface
import com.peakadex.app.core.ui.theme.PeakSubtle
import com.peakadex.app.core.ui.theme.PeakTextHeadline
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.ln
import kotlin.math.tan

// Rarity palette lives in core/ui/RarityPalette.kt (shared with HomeScreen)

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

private val CloseSmallIcon: ImageVector by lazy {
    ImageVector.Builder("CloseSmall", 16.dp, 16.dp, 16f, 16f).apply {
        path(stroke = SolidColor(Color.Unspecified), strokeLineWidth = 1.8f, strokeLineCap = StrokeCap.Round) { moveTo(12f, 4f); lineTo(4f, 12f) }
        path(stroke = SolidColor(Color.Unspecified), strokeLineWidth = 1.8f, strokeLineCap = StrokeCap.Round) { moveTo(4f, 4f); lineTo(12f, 12f) }
    }.build()
}

// Share icon — 3 nodes connected by lines (matches web AscentCard)
private val ShareNetworkIcon: ImageVector by lazy {
    ImageVector.Builder("ShareNetwork", 20.dp, 20.dp, 20f, 20f).apply {
        // Top-right circle (cx=16, cy=4, r=2) → fill
        path(fill = SolidColor(Color.Unspecified), stroke = SolidColor(Color.Unspecified), strokeLineWidth = 1.4f) {
            moveTo(18f, 4f); arcTo(2f, 2f, 0f, false, true, 14f, 4f); arcTo(2f, 2f, 0f, false, true, 18f, 4f); close()
        }
        // Left circle (cx=4, cy=10, r=2)
        path(fill = SolidColor(Color.Unspecified), stroke = SolidColor(Color.Unspecified), strokeLineWidth = 1.4f) {
            moveTo(6f, 10f); arcTo(2f, 2f, 0f, false, true, 2f, 10f); arcTo(2f, 2f, 0f, false, true, 6f, 10f); close()
        }
        // Bottom-right circle (cx=16, cy=16, r=2)
        path(fill = SolidColor(Color.Unspecified), stroke = SolidColor(Color.Unspecified), strokeLineWidth = 1.4f) {
            moveTo(18f, 16f); arcTo(2f, 2f, 0f, false, true, 14f, 16f); arcTo(2f, 2f, 0f, false, true, 18f, 16f); close()
        }
        // Connecting lines
        path(stroke = SolidColor(Color.Unspecified), strokeLineWidth = 1.8f, strokeLineCap = StrokeCap.Round, fill = null) {
            moveTo(6f, 9f); lineTo(14f, 5f)
        }
        path(stroke = SolidColor(Color.Unspecified), strokeLineWidth = 1.8f, strokeLineCap = StrokeCap.Round, fill = null) {
            moveTo(6f, 11f); lineTo(14f, 15f)
        }
    }.build()
}

// Pencil / edit icon (matches web AscentCard)
private val PencilIcon: ImageVector by lazy {
    ImageVector.Builder("Pencil", 20.dp, 20.dp, 20f, 20f).apply {
        path(stroke = SolidColor(Color.Unspecified), strokeLineWidth = 1.8f,
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

    Column(modifier = Modifier.fillMaxSize()) {

        // ── Quick filter: Mis Cards | Mi Cordada ──────────────────────────────
        QuickFilterBar(
            viewFilter         = filters.viewFilter,
            onViewFilterChange = vm::setViewFilter,
        )

        // ── Peak filter chip — only when navigating from Atlas ─────────────
        if (filters.peakId != null) {
            PeakFilterChip(
                peakName  = filters.peakName ?: filters.peakId ?: "",
                onDismiss = { vm.setPeakFilter(null, null) },
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
                    filteredAscents.isEmpty() && filters.peakId != null ->
                        LogbookNoResultsState()
                    filteredAscents.isEmpty() && filters.viewFilter == ViewFilter.Friends ->
                        LogbookFriendsEmptyState()
                    filteredAscents.isEmpty() ->
                        LogbookEmptyState()
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
}

// ── Quick filter bar — SegmentedButton (M3) ───────────────────────────────────

@Composable
private fun QuickFilterBar(
    viewFilter: ViewFilter,
    onViewFilterChange: (ViewFilter) -> Unit,
) {
    SingleChoiceSegmentedButtonRow(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
    ) {
        SegmentedButton(
            shape    = SegmentedButtonDefaults.itemShape(index = 0, count = 2),
            selected = viewFilter == ViewFilter.Mine,
            onClick  = { onViewFilterChange(ViewFilter.Mine) },
            colors   = SegmentedButtonDefaults.colors(
                activeContainerColor  = PeakBlueActive.copy(alpha = 0.10f),
                activeContentColor    = PeakBlueActive,
                activeBorderColor     = PeakBlueActive,
                inactiveContainerColor = Color.White,
                inactiveContentColor  = PeakMuted,
                inactiveBorderColor   = PeakBorderLight,
            ),
            label = {
                Text(
                    "Mis Cards",
                    fontSize   = 13.sp,
                    fontWeight = if (viewFilter == ViewFilter.Mine) FontWeight.SemiBold else FontWeight.Normal,
                )
            },
        )
        SegmentedButton(
            shape    = SegmentedButtonDefaults.itemShape(index = 1, count = 2),
            selected = viewFilter == ViewFilter.Friends,
            onClick  = { onViewFilterChange(ViewFilter.Friends) },
            colors   = SegmentedButtonDefaults.colors(
                activeContainerColor  = PeakBlueActive.copy(alpha = 0.10f),
                activeContentColor    = PeakBlueActive,
                activeBorderColor     = PeakBlueActive,
                inactiveContainerColor = Color.White,
                inactiveContentColor  = PeakMuted,
                inactiveBorderColor   = PeakBorderLight,
            ),
            label = {
                Text(
                    "Mi Cordada",
                    fontSize   = 13.sp,
                    fontWeight = if (viewFilter == ViewFilter.Friends) FontWeight.SemiBold else FontWeight.Normal,
                )
            },
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
                Icon(CloseSmallIcon, "Quitar filtro de cima", Modifier.size(14.dp), tint = Color(0xFF0369A1))
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
    rarity:       RarityInfo,
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
private fun CardBack(ascent: Ascent, rarity: RarityInfo) {
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
                Text("ESTADÍSTICAS PEAKADEX", fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.07.em, color = MaterialTheme.colorScheme.onSurfaceVariant)
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

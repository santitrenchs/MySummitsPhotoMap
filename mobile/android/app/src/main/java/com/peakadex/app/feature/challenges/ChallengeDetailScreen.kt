package com.peakadex.app.feature.challenges

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import coil3.compose.AsyncImage
import com.peakadex.app.R
import com.peakadex.app.core.model.ChallengePeakRow
import com.peakadex.app.core.ui.PeakFilterButton
import com.peakadex.app.core.ui.PeakSearchField
import com.peakadex.app.core.ui.RARITY_PALETTE
import com.peakadex.app.core.ui.theme.PeakBackground
import com.peakadex.app.core.ui.theme.PeakGreenCTA
import com.peakadex.app.core.ui.theme.PeakMuted
import com.peakadex.app.core.ui.theme.PeakNavyDark
import com.peakadex.app.core.ui.theme.PeakNavyMid
import com.peakadex.app.core.ui.theme.PeakSubtle
import com.peakadex.app.core.util.altitudeUnit
import com.peakadex.app.core.util.altitudeValue
import com.peakadex.app.core.util.formatAltitude

/**
 * Detalle de un reto, a pantalla completa en el navController externo.
 *
 * Como drill-down pierde la barra inferior, igual que `CordadaDetailRoute`.
 */
@Composable
fun ChallengeDetailRoute(
    challengeId: String,
    onBack: () -> Unit,
    onLogAscent: (peakId: String, peakName: String) -> Unit,
    onOpenPeakCards: (peakId: String, peakName: String) -> Unit,
    vm: ChallengeDetailViewModel = viewModel(),
) {
    LaunchedEffect(challengeId) { vm.load(challengeId) }
    BackHandler { onBack() }
    ChallengeDetailScreen(vm, onBack, onLogAscent, onOpenPeakCards)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChallengeDetailScreen(
    vm: ChallengeDetailViewModel,
    onBack: () -> Unit,
    onLogAscent: (String, String) -> Unit,
    onOpenPeakCards: (String, String) -> Unit,
) {
    val state by vm.state.collectAsStateWithLifecycle()
    var filtersOpen by remember { mutableStateOf(false) }
    var menuOpen by remember { mutableStateOf(false) }
    var confirmLeave by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = PeakBackground,
        topBar = {
            // Barra sobria: solo atrás y el overflow. El nombre del reto vive en la
            // cabecera, no se duplica aquí.
            CenterAlignedTopAppBar(
                title = {},
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(BackIcon, stringResource(R.string.action_back), tint = PeakNavyDark)
                    }
                },
                actions = {
                    if (state.challenge?.isJoined == true) {
                        IconButton(onClick = { menuOpen = true }) {
                            Icon(MoreIcon, null, tint = PeakNavyDark)
                        }
                        DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                            DropdownMenuItem(
                                text = { Text(stringResource(R.string.challenges_atlas_exit), color = Color(0xFFDC2626)) },
                                onClick = { menuOpen = false; confirmLeave = true },
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.White),
            )
        },
    ) { inner ->
        val c = state.challenge
        when {
            state.isLoading -> Box(Modifier.fillMaxSize().padding(inner), Alignment.Center) {
                CircularProgressIndicator()
            }
            c == null -> Box(Modifier.fillMaxSize().padding(inner), Alignment.Center) {
                Text(state.error ?: "", color = PeakSubtle, fontSize = 13.sp)
            }
            else -> LazyVerticalGrid(
                // Un solo grid para toda la pantalla: la mitad de arriba es un
                // mosaico y la de abajo una lista, y así ambas se reciclan. Con 500
                // cimas, dos listas anidadas pagarían el layout de todo lo que no se ve.
                columns = GridCells.Fixed(3),
                modifier = Modifier.fillMaxSize().padding(inner),
                contentPadding = PaddingValues(bottom = 32.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(maxLineSpan) }) {
                    Column {
                        DetailHeader(
                            name = c.name,
                            description = c.description,
                            coverUrl = c.coverUrl,
                            done = c.completedPeaks,
                            total = c.totalPeaks,
                            maxAltitudeM = c.maxAltitudeM,
                        )
                        FilterBar(
                            query = state.query,
                            onQuery = vm::onQuery,
                            dirty = state.query.isNotBlank() ||
                                state.status != ChallengeStatusFilter.ALL ||
                                state.sort != ChallengeSort.ALTITUDE_DESC,
                            onOpenFilters = { filtersOpen = true },
                        )
                    }
                }

                val done = state.doneRows
                val pending = state.pendingRows

                if (done.isNotEmpty()) {
                    item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(maxLineSpan) }) {
                        SectionHead(stringResource(R.string.challenges_section_collection), done.size)
                    }
                    items(done, key = { "d-${it.id}" }) { p ->
                        PeakTile(p) { onOpenPeakCards(p.id, p.name) }
                    }
                }

                if (pending.isNotEmpty()) {
                    item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(maxLineSpan) }) {
                        SectionHead(stringResource(R.string.challenges_filter_pending), pending.size)
                    }
                    // Las pendientes son UNA columna a cualquier ancho: son texto,
                    // no fotos, y la forma es la que lleva el estado.
                    items(pending, span = { androidx.compose.foundation.lazy.grid.GridItemSpan(maxLineSpan) }, key = { "p-${it.id}" }) { p ->
                        PendingRow(p) { onLogAscent(p.id, p.name) }
                    }
                }

                if (done.isEmpty() && pending.isEmpty()) {
                    item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(maxLineSpan) }) {
                        Text(
                            stringResource(R.string.challenges_no_peak_match),
                            fontSize = 13.sp, color = PeakSubtle,
                            modifier = Modifier.fillMaxWidth().padding(32.dp),
                        )
                    }
                }
            }
        }
    }

    if (filtersOpen) {
        val sheet = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { filtersOpen = false },
            sheetState = sheet,
            containerColor = Color.White,
        ) {
            FiltersSheet(
                state = state,
                onStatus = vm::onStatus,
                onSort = vm::onSort,
                onClose = { filtersOpen = false },
            )
        }
    }

    if (confirmLeave) {
        AlertDialog(
            onDismissRequest = { confirmLeave = false },
            title = { Text(stringResource(R.string.challenges_atlas_exit)) },
            confirmButton = {
                TextButton(onClick = { confirmLeave = false; vm.leave(onBack) }) {
                    Text(stringResource(R.string.challenges_atlas_exit), color = Color(0xFFDC2626))
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmLeave = false }) { Text(stringResource(R.string.action_cancel)) }
            },
        )
    }
}

@Composable
private fun DetailHeader(
    name: String,
    description: String?,
    coverUrl: String?,
    done: Int,
    total: Int,
    maxAltitudeM: Int,
) {
    Column(Modifier.fillMaxWidth().background(Color.White).padding(16.dp)) {
        Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            ChallengePatch(coverUrl, name, size = 76)
            Column(Modifier.weight(1f)) {
                Text(name, fontSize = 19.sp, fontWeight = FontWeight.ExtraBold, color = PeakNavyDark)
                if (!description.isNullOrBlank()) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        description, fontSize = 12.sp, color = PeakMuted,
                        maxLines = 2, overflow = TextOverflow.Ellipsis, lineHeight = 16.sp,
                    )
                }
            }
        }

        Spacer(Modifier.height(14.dp))
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.weight(1f)) { DetailProgressBar(done, total) }
            Text("${progressPct(done, total)}%", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = PeakGreenCTA)
        }

        Spacer(Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = stringResource(R.string.challenges_progress, done, total) + " · " +
                    pluralStringResource(
                        R.plurals.challenges_detail_pending,
                        (total - done).coerceAtLeast(0), (total - done).coerceAtLeast(0),
                    ),
                fontSize = 12.sp, color = PeakMuted, modifier = Modifier.weight(1f),
            )
            if (maxAltitudeM > 0) {
                Text(
                    stringResource(R.string.challenges_detail_highest).uppercase() + " " + formatAltitude(maxAltitudeM),
                    fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = PeakSubtle,
                )
            }
        }
    }
}

/** Misma regla que en el listado: muescas hasta 30, lisa por encima, sin tirador. */
@Composable
private fun DetailProgressBar(done: Int, total: Int) {
    if (total in 1..30) {
        Row(Modifier.fillMaxWidth().height(5.dp), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            repeat(total) { i ->
                Box(
                    Modifier.weight(1f).fillMaxSize().clip(CircleShape)
                        .background(if (i < done) PeakGreenCTA else Color(0xFFE9EDF2)),
                )
            }
        }
    } else {
        Box(Modifier.fillMaxWidth().height(5.dp).clip(CircleShape).background(Color(0xFFE9EDF2))) {
            val frac = if (total > 0) (done.toFloat() / total).coerceIn(0f, 1f) else 0f
            if (frac > 0f) Box(Modifier.fillMaxWidth(frac).fillMaxSize().clip(CircleShape).background(PeakGreenCTA))
        }
    }
}

@Composable
private fun FilterBar(query: String, onQuery: (String) -> Unit, dirty: Boolean, onOpenFilters: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        PeakSearchField(
            value = query, onValueChange = onQuery,
            placeholder = stringResource(R.string.challenges_search_peak),
            modifier = Modifier.weight(1f),
        )
        PeakFilterButton(
            label = stringResource(R.string.challenges_filters),
            active = dirty, showBadge = dirty, onClick = onOpenFilters,
        )
    }
}

@Composable
private fun SectionHead(label: String, count: Int) {
    Row(
        Modifier.fillMaxWidth().padding(start = 14.dp, end = 14.dp, top = 12.dp, bottom = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(label.uppercase(), fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = PeakNavyMid)
        Text("$count", fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = PeakSubtle)
        HorizontalDivider(Modifier.weight(1f), thickness = 1.dp, color = Color(0xFFE9EDF2))
    }
}

/**
 * Tile de "Tu colección": foto 4:5 con la insignia de rareza y el nombre al pie.
 *
 * Que haya foto ES el estado — por eso no lleva tilde verde.
 */
@Composable
private fun PeakTile(peak: ChallengePeakRow, onClick: () -> Unit) {
    val rarity = RARITY_PALETTE.find { it.id == peak.rarityId }
    Box(
        Modifier
            .aspectRatio(4f / 5f)
            .clip(RoundedCornerShape(10.dp))
            .background(PeakNavyDark)
            .clickable(onClick = onClick),
    ) {
        if (!peak.photoUrl.isNullOrBlank()) {
            AsyncImage(
                model = peak.photoUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
        }
        // Degradado para que el texto se lea sobre cualquier foto.
        Box(
            Modifier.fillMaxSize().background(
                Brush.verticalGradient(
                    0.45f to Color.Transparent,
                    1f to Color.Black.copy(alpha = 0.72f),
                ),
            ),
        )
        Box(
            Modifier.padding(5.dp).size(20.dp).clip(CircleShape)
                .background(Color.White.copy(alpha = 0.95f)),
            contentAlignment = Alignment.Center,
        ) {
            Text("✿", fontSize = 12.sp, lineHeight = 12.sp, color = rarity?.color ?: PeakGreenCTA)
        }
        Column(Modifier.align(Alignment.BottomStart).padding(7.dp)) {
            Text(
                peak.name, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                maxLines = 2, overflow = TextOverflow.Ellipsis, lineHeight = 13.sp,
            )
            Text(formatAltitude(peak.altitudeM), color = Color.White.copy(alpha = 0.85f), fontSize = 10.sp)
        }
    }
}

/**
 * Fila de "Pendientes". Toda la fila abre el alta de ascensión con la cima puesta.
 *
 * ⚠️ Sin botón "Registrar": reservaba ancho y dejaba la altitud flotando a media
 * fila; no reservarlo hacía saltar el texto al aparecer.
 */
@Composable
private fun PendingRow(peak: ChallengePeakRow, onClick: () -> Unit) {
    val rarity = RARITY_PALETTE.find { it.id == peak.rarityId }
    Column {
        Row(
            Modifier
                .fillMaxWidth()
                .background(Color.White)
                .clickable(onClick = onClick)
                .padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text("✿", fontSize = 13.sp, color = rarity?.color ?: PeakGreenCTA)
            Text(
                peak.name, fontSize = 13.sp, color = PeakNavyDark,
                maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f),
            )
            // ⚠️ Valor y unidad separados a propósito: el número va oscuro y la
            // unidad más clara. Usar formatAltitude aquí perdería ese contraste.
            Row(verticalAlignment = Alignment.Bottom) {
                Text(altitudeValue(peak.altitudeM), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = PeakNavyDark)
                Spacer(Modifier.width(2.dp))
                Text(altitudeUnit(), fontSize = 11.sp, fontWeight = FontWeight.Medium, color = PeakSubtle)
            }
        }
        HorizontalDivider(thickness = 1.dp, color = Color(0xFFF1F5F8))
    }
}

@Composable
private fun FiltersSheet(
    state: ChallengeDetailUiState,
    onStatus: (ChallengeStatusFilter) -> Unit,
    onSort: (ChallengeSort) -> Unit,
    onClose: () -> Unit,
) {
    Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp, vertical = 8.dp)) {
        Text(stringResource(R.string.challenges_filter_status).uppercase(), fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = PeakNavyMid)
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Chip(stringResource(R.string.challenges_filter_all), state.status == ChallengeStatusFilter.ALL) { onStatus(ChallengeStatusFilter.ALL) }
            Chip(stringResource(R.string.challenges_filter_done), state.status == ChallengeStatusFilter.DONE) { onStatus(ChallengeStatusFilter.DONE) }
            Chip(stringResource(R.string.challenges_filter_pending), state.status == ChallengeStatusFilter.PENDING) { onStatus(ChallengeStatusFilter.PENDING) }
        }

        Spacer(Modifier.height(18.dp))
        Text(stringResource(R.string.challenges_filters).uppercase(), fontSize = 10.5.sp, fontWeight = FontWeight.Bold, color = PeakNavyMid)
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Chip("▼ " + altitudeUnit(), state.sort == ChallengeSort.ALTITUDE_DESC) { onSort(ChallengeSort.ALTITUDE_DESC) }
            Chip("▲ " + altitudeUnit(), state.sort == ChallengeSort.ALTITUDE_ASC) { onSort(ChallengeSort.ALTITUDE_ASC) }
            // Solo si este reto tiene de verdad más de un valor — ver el ViewModel.
            if (state.canSortByComarca) {
                Chip(stringResource(R.string.challenges_sort_comarca), state.sort == ChallengeSort.COMARCA) { onSort(ChallengeSort.COMARCA) }
            }
        }

        Spacer(Modifier.height(20.dp))
        Box(
            Modifier.fillMaxWidth().height(48.dp).clip(RoundedCornerShape(24.dp))
                .background(PeakGreenCTA).clickable(onClick = onClose),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                pluralStringResource(R.plurals.challenges_filter_show, state.filtered.size, state.filtered.size),
                color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold,
            )
        }
        Spacer(Modifier.height(12.dp))
    }
}

@Composable
private fun Chip(label: String, active: Boolean, onClick: () -> Unit) {
    Box(
        Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(if (active) PeakNavyDark else Color(0xFFF3F4F6))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 9.dp),
    ) {
        Text(
            label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
            color = if (active) Color.White else PeakNavyDark,
        )
    }
}

// ── Iconos inline ─────────────────────────────────────────────────────────────
// Sin dependencia de Material Icons, como el resto de la app.
// ⚠️ Los paths se construyen con un color concreto, nunca Color.Unspecified: ese
// no pinta píxeles y el tint del Icon no tendría nada que recolorear.

private val BackIcon: ImageVector by lazy {
    ImageVector.Builder("Back", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke = SolidColor(Color(0xFF374151)),
            strokeLineWidth = 2f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ) {
            moveTo(15f, 18f); lineTo(9f, 12f); lineTo(15f, 6f)
        }
    }.build()
}

private val MoreIcon: ImageVector by lazy {
    ImageVector.Builder("More", 24.dp, 24.dp, 24f, 24f).apply {
        path(fill = SolidColor(Color(0xFF374151))) {
            // Centrado en x=12: un glifo descentrado se ve desalineado respecto a
            // los de al lado aunque la caja de layout sea idéntica.
            moveTo(12f, 8f)
            curveTo(13.1f, 8f, 14f, 7.1f, 14f, 6f)
            curveTo(14f, 4.9f, 13.1f, 4f, 12f, 4f)
            curveTo(10.9f, 4f, 10f, 4.9f, 10f, 6f)
            curveTo(10f, 7.1f, 10.9f, 8f, 12f, 8f)
            close()
            moveTo(12f, 10f)
            curveTo(10.9f, 10f, 10f, 10.9f, 10f, 12f)
            curveTo(10f, 13.1f, 10.9f, 14f, 12f, 14f)
            curveTo(13.1f, 14f, 14f, 13.1f, 14f, 12f)
            curveTo(14f, 10.9f, 13.1f, 10f, 12f, 10f)
            close()
            moveTo(12f, 16f)
            curveTo(10.9f, 16f, 10f, 16.9f, 10f, 18f)
            curveTo(10f, 19.1f, 10.9f, 20f, 12f, 20f)
            curveTo(13.1f, 20f, 14f, 19.1f, 14f, 18f)
            curveTo(14f, 16.9f, 13.1f, 16f, 12f, 16f)
            close()
        }
    }.build()
}

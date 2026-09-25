package com.peakadex.app.feature.challenges

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil3.compose.AsyncImage
import com.peakadex.app.R
import com.peakadex.app.core.model.ChallengeAvailable
import com.peakadex.app.core.model.ChallengeSummary
import com.peakadex.app.core.ui.PeakSearchField
import com.peakadex.app.core.ui.theme.PeakBorderLight
import com.peakadex.app.core.ui.theme.PeakGreenCTA
import com.peakadex.app.core.ui.theme.PeakMuted
import com.peakadex.app.core.ui.theme.PeakNavyDark
import com.peakadex.app.core.ui.theme.PeakSubtle
import com.peakadex.app.core.ui.theme.PeakSurfaceVariant

/**
 * Porcentaje de una barra de progreso hecho/total.
 *
 * Espejo de `lib/progress-pct.ts`. Redondea a entero pero **nunca a una cifra que
 * contradiga la fracción de al lado**: 521 de 522 no es "100%" mientras falte una
 * cima, y 1 de 522 no es "0%" cuando ya has subido algo. Esos dos extremos solo
 * aparecen en retos largos, que es justo donde la barra es lisa y el porcentaje es
 * lo único preciso en pantalla.
 */
internal fun progressPct(done: Int, total: Int): Int {
    if (total <= 0 || done <= 0) return 0
    if (done >= total) return 100
    return ((done.toDouble() / total) * 100).toInt().coerceIn(1, 99)
}

/** Más allá de esto las muescas dejan de ser contables y la barra se rellena lisa. */
private const val SEGMENTED_MAX = 30

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChallengesTab(
    onLogAscent: (peakId: String, peakName: String) -> Unit,
    onOpenPeakCards: (peakId: String, peakName: String) -> Unit,
    onViewOnAtlas: (challengeId: String, challengeName: String) -> Unit,
    vm: ChallengesViewModel = viewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()
    var sheetOpen by remember { mutableStateOf(false) }

    // El detalle vive DENTRO de la pestaña, no en una ruta aparte: así la tira de
    // tabs sigue arriba y el detalle se lee como parte de Bitácora, igual que en
    // web. Cada pestaña es además una salida.
    //
    // Al volver se recarga la lista, porque desde el detalle se puede salir de un
    // reto y la tarjeta tiene que desaparecer.
    var openChallengeId by remember { mutableStateOf<String?>(null) }
    openChallengeId?.let { id ->
        ChallengeDetailRoute(
            challengeId = id,
            onBack = { openChallengeId = null; vm.load() },
            onLogAscent = onLogAscent,
            onOpenPeakCards = onOpenPeakCards,
            onViewOnAtlas = onViewOnAtlas,
        )
        return
    }

    Column(Modifier.fillMaxSize()) {
        // ── Buscador + Añadir ────────────────────────────────────────────────
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            PeakSearchField(
                value = state.query,
                onValueChange = vm::onQueryChange,
                placeholder = stringResource(R.string.challenges_search_hint),
                modifier = Modifier.weight(1f),
            )
            Button(
                onClick = { sheetOpen = true },
                colors = ButtonDefaults.buttonColors(containerColor = PeakGreenCTA),
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier.height(48.dp),
            ) {
                Text(stringResource(R.string.challenges_add), fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
        }

        // Línea de recuento: "1 reto activo · 2 disponibles"
        if (!state.isLoading) {
            Text(
                text = buildString {
                    append(pluralStringResource(R.plurals.challenges_count_active, state.mine.size, state.mine.size))
                    if (state.availableCount > 0) {
                        append(" · ")
                        append(pluralStringResource(R.plurals.challenges_count_available, state.availableCount, state.availableCount))
                    }
                },
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = PeakSubtle,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp),
            )
        }

        when {
            state.isLoading -> Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }

            state.filteredMine.isEmpty() -> EmptyState(
                // Con búsqueda activa el vacío significa "no hay coincidencias",
                // no "no sigues ningún reto" — y el remedio del usuario es distinto.
                searching = state.query.isNotBlank(),
            )

            else -> LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(
                    start = 12.dp, end = 12.dp, top = 6.dp, bottom = 24.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(state.filteredMine, key = { it.id }) { c ->
                    ChallengeRow(c) { openChallengeId = c.id }
                }
            }
        }
    }

    if (sheetOpen) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { sheetOpen = false },
            sheetState = sheetState,
            containerColor = Color.White,
        ) {
            AvailableChallengesSheet(
                state = state,
                onQuery = vm::onSheetQueryChange,
                onJoin = { c -> vm.join(c) { sheetOpen = false } },
            )
        }
    }
}

/** Una tarjeta por reto: no comparten superficie. Ver DESIGN.md → Retos. */
@Composable
private fun ChallengeRow(c: ChallengeSummary, onClick: () -> Unit) {
    val pct = progressPct(c.completedPeaks, c.totalPeaks)
    val remaining = (c.totalPeaks - c.completedPeaks).coerceAtLeast(0)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White)
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        ChallengePatch(c.coverUrl, c.name, size = 60)

        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = c.name,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = PeakNavyDark,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Spacer(Modifier.width(8.dp))
                // El porcentaje ocupa el hueco destacado de la derecha; la fracción
                // baja al subtítulo para que no compitan.
                Text("$pct%", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = PeakGreenCTA)
            }

            Spacer(Modifier.height(6.dp))
            ProgressBar(done = c.completedPeaks, total = c.totalPeaks)
            Spacer(Modifier.height(6.dp))

            Text(
                text = if (c.completedPeaks >= c.totalPeaks && c.totalPeaks > 0) {
                    stringResource(R.string.challenges_completed)
                } else {
                    stringResource(R.string.challenges_progress, c.completedPeaks, c.totalPeaks) +
                        " · " + pluralStringResource(R.plurals.challenges_remaining, remaining, remaining)
                },
                fontSize = 11.sp,
                color = PeakMuted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

/**
 * Barra de progreso: una muesca por cima hasta `SEGMENTED_MAX`, relleno liso por
 * encima.
 *
 * ⚠️ **Nunca con tirador.** Un círculo en el borde del relleno se lee como un
 * slider, y esta barra no hace nada al tocarla.
 */
@Composable
private fun ProgressBar(done: Int, total: Int) {
    if (total in 1..SEGMENTED_MAX) {
        Row(
            Modifier.fillMaxWidth().height(4.dp),
            horizontalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            repeat(total) { i ->
                Box(
                    Modifier
                        .weight(1f)
                        .fillMaxSize()
                        .clip(CircleShape)
                        .background(if (i < done) PeakGreenCTA else PeakSurfaceVariant),
                )
            }
        }
    } else {
        Box(Modifier.fillMaxWidth().height(4.dp).clip(CircleShape).background(PeakSurfaceVariant)) {
            val frac = if (total > 0) (done.toFloat() / total).coerceIn(0f, 1f) else 0f
            if (frac > 0f) {
                Box(Modifier.fillMaxWidth(frac).fillMaxSize().clip(CircleShape).background(PeakGreenCTA))
            }
        }
    }
}

/**
 * La chapa del reto.
 *
 * ⚠️ `ContentScale.Fit` y **sin recorte circular**: el dibujo ya es un disco con su
 * propio anillo y recortarlo se lo rebana. Los retos sin chapa sí llevan círculo,
 * porque ahí el círculo es la forma y no un recorte.
 */
@Composable
internal fun ChallengePatch(coverUrl: String?, name: String, size: Int) {
    if (!coverUrl.isNullOrBlank()) {
        AsyncImage(
            model = coverUrl,
            contentDescription = null,
            contentScale = ContentScale.Fit,
            modifier = Modifier.size(size.dp),
        )
    } else {
        Box(
            modifier = Modifier
                .size(size.dp)
                .clip(CircleShape)
                .background(Brush.linearGradient(listOf(PeakGreenCTA, Color(0xFF4A8C5C)))),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = name.take(1).uppercase(),
                color = Color.White,
                fontSize = (size / 2.4f).sp,
                fontWeight = FontWeight.Black,
            )
        }
    }
}

@Composable
private fun EmptyState(searching: Boolean) {
    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 32.dp, vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (searching) {
            Text(
                stringResource(R.string.challenges_no_search_match),
                fontSize = 13.sp, color = PeakSubtle, textAlign = TextAlign.Center,
            )
        } else {
            Text(
                stringResource(R.string.challenges_empty_title),
                fontSize = 15.sp, fontWeight = FontWeight.SemiBold,
                color = PeakNavyDark, textAlign = TextAlign.Center,
            )
            Text(
                stringResource(R.string.challenges_empty_body),
                fontSize = 13.sp, color = PeakSubtle, textAlign = TextAlign.Center,
            )
        }
    }
}

/**
 * Hoja "Retos disponibles" — el momento de descubrimiento.
 *
 * Los ya unidos **no se esconden**: se pintan marcados, para que el usuario vea
 * dónde fue a parar el que acaba de añadir en vez de verlo desaparecer.
 */
@Composable
private fun AvailableChallengesSheet(
    state: ChallengesUiState,
    onQuery: (String) -> Unit,
    onJoin: (ChallengeAvailable) -> Unit,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(bottom = 12.dp),
    ) {
        Text(
            stringResource(R.string.challenges_available_title),
            fontSize = 17.sp, fontWeight = FontWeight.Bold, color = PeakNavyDark,
            modifier = Modifier.padding(start = 20.dp, end = 20.dp, bottom = 10.dp),
        )
        PeakSearchField(
            value = state.sheetQuery,
            onValueChange = onQuery,
            placeholder = stringResource(R.string.challenges_available_search),
            modifier = Modifier.padding(horizontal = 16.dp),
        )
        Spacer(Modifier.height(10.dp))

        if (state.joinFailed) {
            Text(
                stringResource(R.string.challenges_join_failed),
                fontSize = 12.sp, color = Color(0xFFDC2626),
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
            )
        }

        val rows = state.filteredAvailable
        if (rows.isEmpty()) {
            Text(
                text = stringResource(
                    // "no hay coincidencias" y "ya estás en todos" son situaciones
                    // distintas y el usuario hace cosas distintas con cada una.
                    if (state.sheetQuery.isNotBlank()) R.string.challenges_no_available
                    else R.string.challenges_all_joined,
                ),
                fontSize = 13.sp, color = PeakSubtle, textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(32.dp),
            )
        } else {
            LazyColumn(
                // Tope de altura: la hoja nunca ocupa toda la pantalla, para que se
                // siga viendo que hay una lista debajo.
                modifier = Modifier.fillMaxWidth().heightIn(max = 420.dp),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(rows, key = { it.id }) { c ->
                    AvailableRow(c, joining = state.joiningId == c.id) { onJoin(c) }
                }
            }
        }
    }
}

@Composable
private fun AvailableRow(c: ChallengeAvailable, joining: Boolean, onJoin: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color.White)
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        ChallengePatch(c.coverUrl, c.name, size = 60)
        Column(Modifier.weight(1f)) {
            Text(
                c.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = PeakNavyDark,
                maxLines = 2, overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                pluralStringResource(R.plurals.challenges_peaks_count, c.totalPeaks, c.totalPeaks),
                fontSize = 11.sp, color = PeakSubtle,
            )
        }
        if (c.isJoined) {
            Text(
                stringResource(R.string.challenges_joined_badge),
                fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = PeakGreenCTA,
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(PeakSurfaceVariant)
                    .padding(horizontal = 12.dp, vertical = 6.dp),
            )
        } else {
            Button(
                onClick = onJoin,
                enabled = !joining,
                colors = ButtonDefaults.buttonColors(containerColor = PeakGreenCTA),
                shape = RoundedCornerShape(20.dp),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            ) {
                Text(
                    stringResource(if (joining) R.string.challenges_joining else R.string.challenges_join),
                    fontSize = 12.sp, fontWeight = FontWeight.Bold,
                )
            }
        }
    }
    Spacer(Modifier.height(0.dp))
    androidx.compose.material3.HorizontalDivider(thickness = 1.dp, color = PeakBorderLight.copy(alpha = 0.5f))
}

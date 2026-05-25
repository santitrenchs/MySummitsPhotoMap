package com.peakadex.app.feature.home

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.BiasAlignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil3.compose.AsyncImage
import com.peakadex.app.AppContainer
import com.peakadex.app.R
import com.peakadex.app.core.model.HomeData
import com.peakadex.app.core.model.LeaderboardEntry
import com.peakadex.app.core.model.MonthlyBar
import com.peakadex.app.core.model.RarityBreakdown
import com.peakadex.app.core.model.RecentAscentSummary
import com.peakadex.app.core.model.User
import com.peakadex.app.core.model.UserStats
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale

// ── Level definitions — mirrors lib/level-utils.ts exactly ───────────────────
//
// 6 levels. Progress measured in uniquePeaks (distinct summits), not totalAscents.
// altReqs: altitude thresholds that must also be met.

private data class AltReq(val threshold: Int, val count: Int)
private data class LocalLevelDef(
    val idx: Int,
    val emoji: String,
    val name: String,
    val targetAscents: Int,          // unique peaks required
    val altReqs: List<AltReq> = emptyList(),
)

private val LEVEL_DEFS = listOf(
    LocalLevelDef(1, "🌱", "Scout",    20,  listOf(AltReq(2000, 1))),
    LocalLevelDef(2, "🥾", "Guide",    50,  listOf(AltReq(3000, 1))),
    LocalLevelDef(3, "🧭", "Explorer", 100, listOf(AltReq(4000, 1))),
    LocalLevelDef(4, "⛰️", "Alpinist", 150, listOf(AltReq(5000, 1))),
    LocalLevelDef(5, "🏔️", "Master",   220, listOf(AltReq(6500, 1))),
    LocalLevelDef(6, "👑", "Zenith",   300, listOf(AltReq(8000, 1))),
)

// Level accent colours — matches web LEVEL_COLORS (index = def.idx - 1)
private val LEVEL_ACCENT = listOf(
    Color(0xFF16A34A),  // 1 Scout    — green
    Color(0xFFD97706),  // 2 Guide    — amber
    Color(0xFFEA580C),  // 3 Explorer — orange
    Color(0xFF1D4ED8),  // 4 Alpinist — blue
    Color(0xFF7C3AED),  // 5 Master   — purple
    Color(0xFFB45309),  // 6 Zenith   — gold
)
private fun levelAccent(idx: Int) = LEVEL_ACCENT[(idx - 1).coerceIn(0, LEVEL_ACCENT.lastIndex)]

// ── Rarity palette — mirrors lib/rarity.ts (same IDs + colors) ───────────────

private data class RarityMeta(val label: String, val color: Color)
private val RARITIES = listOf(
    RarityMeta("Daisy",      Color(0xFF00995C)),
    RarityMeta("Heather",    Color(0xFF06B6D4)),
    RarityMeta("Gentian",    Color(0xFF1E40AF)),
    RarityMeta("Tundra",     Color(0xFF0E7490)),
    RarityMeta("Edelweiss",  Color(0xFFA855F7)),
    RarityMeta("Draba",      Color(0xFFEC4899)),
    RarityMeta("Saxifrage",  Color(0xFFF97316)),
    RarityMeta("Cinquefoil", Color(0xFFEAB308)),
    RarityMeta("Snow Lotus", Color(0xFF94A3B8)),
)

// Returns unique-peaks count for a given altitude threshold (mirrors getAltCount)
private fun getAltCount(stats: UserStats, threshold: Int): Int = when {
    threshold >= 8000 -> stats.peaks8000plus
    threshold >= 6500 -> stats.peaks6500plus
    threshold >= 5000 -> stats.peaks5000plus
    threshold >= 4000 -> stats.peaks4000plus
    threshold >= 3000 -> stats.peaks3000plus
    threshold >= 2000 -> stats.peaks2000plus
    else              -> stats.peaks1000plus
}

// Returns true if uniquePeaks + altReqs are all satisfied (mirrors meetsLevel)
private fun meetsLevel(def: LocalLevelDef, uniquePeaks: Int, stats: UserStats): Boolean {
    if (uniquePeaks < def.targetAscents) return false
    return def.altReqs.all { r -> getAltCount(stats, r.threshold) >= r.count }
}

// ── Entry point ────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(vm: HomeViewModel = viewModel()) {
    val state        by vm.uiState.collectAsStateWithLifecycle()
    val isRefreshing by vm.isRefreshing.collectAsStateWithLifecycle()
    val user         by AppContainer.authSession.currentUser.collectAsStateWithLifecycle()

    when (val s = state) {
        is HomeUiState.Loading -> HomeLoadingState()
        is HomeUiState.Error   -> HomeErrorState(s.message) { vm.load() }
        is HomeUiState.Success -> {
            PullToRefreshBox(
                isRefreshing = isRefreshing,
                onRefresh    = { vm.refresh() },
                modifier     = Modifier.fillMaxSize(),
            ) {
                HomeContent(data = s.data, user = user)
            }
        }
    }
}

// ── Loading / Error ────────────────────────────────────────────────────────────

@Composable
private fun HomeLoadingState() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
    }
}

@Composable
private fun HomeErrorState(message: String, onRetry: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("⚠️", fontSize = 40.sp)
        Spacer(Modifier.height(12.dp))
        Text(
            text  = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(16.dp))
        Button(onClick = onRetry) { Text("Reintentar") }
    }
}

// ── Main content ───────────────────────────────────────────────────────────────

@Composable
private fun HomeContent(data: HomeData, user: User?) {
    var progressionExpanded by remember { mutableStateOf(false) }

    LazyColumn(contentPadding = PaddingValues(bottom = 32.dp)) {

        // 1 — Hero header
        item { HeroHeader(data = data, user = user) }

        // 2 — Onboarding (new users)
        if (data.stats.totalAscents == 0) {
            item { OnboardingBanner() }
        }

        // 3 — Progression
        item {
            ProgressionSection(
                data     = data,
                expanded = progressionExpanded,
                onToggle = { progressionExpanded = !progressionExpanded },
            )
        }

        // 4 — Monthly chart (≥1 ascent)
        if (data.stats.totalAscents >= 1 && data.monthlyStats.isNotEmpty()) {
            item { MonthlyChartSection(data.monthlyStats) }
        }

        // 5 — Rarity chart (≥1 ascent)
        if (data.stats.totalAscents >= 1) {
            item { RarityChartSection(data.stats.rarityBreakdown) }
        }

        // 7 — Leaderboard
        if (data.leaderboard.size > 1) {
            item { SectionTitle("Tu cordada") }
            item { LeaderboardCard(data.leaderboard) }
        }

        // 8 — No friends CTA
        if (data.stats.totalFriends == 0) {
            item { NoFriendsCta() }
        }

        // 9 — Recent ascents
        if (data.recentAscents.isNotEmpty()) {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .padding(top = 24.dp, bottom = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment     = Alignment.CenterVertically,
                ) {
                    Text(
                        text  = "Tus últimas cimas",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                    Text(
                        text  = "Ver todo →",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
            item { RecentAscentsRow(data.recentAscents) }
        }
    }
}

// ── Hero header ────────────────────────────────────────────────────────────────

@Composable
private fun HeroHeader(data: HomeData, user: User?) {
    val levelName   = data.currentLevel?.name ?: "Scout"
    val meEntry     = data.leaderboard.find { it.isCurrentUser }
    val myCairns    = meEntry?.cairns ?: 0
    val myEp        = meEntry?.ep ?: 0
    // Fall back to leaderboard entry when session user is null (e.g. after app restart)
    val displayName = user?.name ?: meEntry?.name ?: ""
    val avatarUrl   = user?.avatarUrl ?: meEntry?.avatarUrl

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 12.dp)
            .clip(RoundedCornerShape(16.dp)),
    ) {
        // Background hero image — aligned centre-60% like the web (slight downward bias)
        Image(
            painter            = painterResource(R.drawable.hero),
            contentDescription = null,
            contentScale       = ContentScale.Crop,
            alignment          = BiasAlignment(0f, -0.2f),
            modifier           = Modifier
                .fillMaxWidth()
                .matchParentSize()
                .background(Color(0xFF1C2D3F)),
        )

        // Dark gradient overlay — mirrors web linear-gradient(to bottom, 0.15→0.45→0.85)
        Box(
            modifier = Modifier
                .matchParentSize()
                .background(
                    Brush.verticalGradient(
                        colorStops = arrayOf(
                            0.00f to Color(0x260A1423),
                            0.55f to Color(0x730A1423),
                            1.00f to Color(0xD90A1423),
                        )
                    )
                )
        )

        // Content
        Column(
            modifier            = Modifier
                .fillMaxWidth()
                .padding(start = 24.dp, end = 24.dp, top = 28.dp, bottom = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Avatar
            Box(
                modifier         = Modifier
                    .size(68.dp)
                    .clip(CircleShape)
                    .border(2.5.dp, Color(0x8CFFFFFF), CircleShape)
                    .background(Brush.linearGradient(listOf(Color(0xFF3A7BD5), Color(0xFF1A4A8A)))),
                contentAlignment = Alignment.Center,
            ) {
                if (avatarUrl != null) {
                    AsyncImage(
                        model              = avatarUrl,
                        contentDescription = displayName,
                        contentScale       = ContentScale.Crop,
                        modifier           = Modifier.fillMaxSize(),
                    )
                } else {
                    Text(
                        text       = initials(displayName.ifEmpty { "?" }),
                        color      = Color.White,
                        fontSize   = 24.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }

            Spacer(Modifier.height(10.dp))

            // Name
            Text(
                text          = displayName,
                fontSize      = 20.sp,
                fontWeight    = FontWeight.Bold,
                color         = Color.White,
                letterSpacing = (-0.03).em,
                lineHeight    = (20 * 1.1).sp,
                textAlign     = androidx.compose.ui.text.style.TextAlign.Center,
            )

            Spacer(Modifier.height(6.dp))

            // Level pill
            Box(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(Color(0xFFEFF6FF))
                    .padding(horizontal = 11.dp, vertical = 3.dp),
            ) {
                Text(
                    text          = levelName,
                    fontSize      = 12.sp,
                    fontWeight    = FontWeight.Bold,
                    color         = Color(0xFF0369A1),
                    letterSpacing = 0.01.em,
                )
            }

            Spacer(Modifier.height(18.dp))

            // Metrics row: Ascensiones | Cimas | Alt. máx
            Row(
                modifier              = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment     = Alignment.CenterVertically,
            ) {
                MetricCell(
                    value = "${data.stats.totalAscents}",
                    label = "ascensiones",
                )
                Box(Modifier.width(1.dp).height(32.dp).background(Color(0x26FFFFFF)))
                MetricCell(
                    value = "${data.stats.uniquePeaks}",
                    label = "cimas",
                )
                Box(Modifier.width(1.dp).height(32.dp).background(Color(0x26FFFFFF)))
                MetricCell(
                    value = if (data.stats.maxAltitude > 0) "${data.stats.maxAltitude}" else "—",
                    label = "alt. máx",
                    unit  = if (data.stats.maxAltitude > 0) "m" else null,
                )
            }

            // Cairns + EP pill (only if there's leaderboard data)
            if (meEntry != null) {
                Spacer(Modifier.height(10.dp))
                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(Color(0x26FFFFFF))
                        .padding(horizontal = 14.dp, vertical = 5.dp),
                ) {
                    Row(
                        verticalAlignment     = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(5.dp),
                    ) {
                        Text("△", fontSize = 12.sp, color = Color(0xFFFBBF24), fontWeight = FontWeight.Bold)
                        Text(
                            text       = "$myCairns Cairns",
                            fontSize   = 12.5.sp,
                            color      = Color(0xFFFBBF24),
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = (-0.01).em,
                        )
                        Text(
                            text     = "·",
                            fontSize = 16.sp,
                            color    = Color(0x59FFFFFF),
                            lineHeight = 16.sp,
                        )
                        Text(
                            text       = "+$myEp EP",
                            fontSize   = 12.5.sp,
                            color      = Color.White,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = (-0.01).em,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MetricCell(value: String, label: String, unit: String? = null) {
    Column(
        modifier            = Modifier.padding(horizontal = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Row(verticalAlignment = Alignment.Top) {
            Text(
                text          = value,
                fontSize      = 18.sp,
                fontWeight    = FontWeight.Bold,
                color         = Color.White,
                letterSpacing = (-0.04).em,
                lineHeight    = 20.sp,
            )
            if (unit != null) {
                Text(
                    text          = unit,
                    fontSize      = 10.sp,
                    fontWeight    = FontWeight.Normal,
                    color         = Color.White.copy(alpha = 0.55f),
                    modifier      = Modifier.padding(start = 1.dp, top = 2.dp),
                    lineHeight    = 14.sp,
                )
            }
        }
        Text(
            text     = label,
            fontSize = 10.5.sp,
            color    = Color(0xA6FFFFFF),  // rgba(255,255,255,0.65)
        )
    }
}

// ── Onboarding banner ──────────────────────────────────────────────────────────

@Composable
private fun OnboardingBanner() {
    Column(
        modifier            = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 16.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Brush.linearGradient(listOf(Color(0xFFF0FDF4), Color(0xFFDCFCE7))))
            .border(1.5.dp, Color(0xFF86EFAC), RoundedCornerShape(16.dp))
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text       = "🏔️ Registra tu primera ascensión",
            fontSize   = 16.sp,
            fontWeight = FontWeight.ExtraBold,
            color      = Color(0xFF14532D),
            letterSpacing = (-0.02).em,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            text       = "Empieza a construir tu historial de cimas.",
            fontSize   = 14.sp,
            color      = Color(0xFF166534),
            lineHeight = 20.sp,
        )
        Spacer(Modifier.height(20.dp))
        Button(
            onClick = { /* Phase 4 — tap FAB */ },
            colors  = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A)),
            shape   = RoundedCornerShape(8.dp),
        ) {
            Text("+ Registrar ascensión", fontWeight = FontWeight.Bold)
        }
    }
}

// ── Progression section ────────────────────────────────────────────────────────

@Composable
private fun ProgressionSection(data: HomeData, expanded: Boolean, onToggle: () -> Unit) {
    val stats       = data.stats
    val uniquePeaks = stats.uniquePeaks

    // Current level = last level whose requirements are fully met
    val currentLevelIdx = remember(uniquePeaks, stats) {
        var idx = 0
        for (i in LEVEL_DEFS.indices) {
            if (meetsLevel(LEVEL_DEFS[i], uniquePeaks, stats)) idx = i
            else break
        }
        idx
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(top = 20.dp)
            .animateContentSize(),
    ) {
        // Collapsed: show only the in-progress level (currentIdx + 1 if exists, else current)
        val inProgressIdx = if (currentLevelIdx < LEVEL_DEFS.lastIndex) currentLevelIdx + 1 else currentLevelIdx
        val defsToShow = if (expanded) LEVEL_DEFS else listOf(LEVEL_DEFS[inProgressIdx])

        defsToShow.forEach { def ->
            val isDone    = meetsLevel(def, uniquePeaks, stats)
            val isLocked  = def.idx > inProgressIdx + 1 && !isDone
            val isCurrent = !isDone && !isLocked

            LevelCard(
                def         = def,
                isCurrent   = isCurrent,
                isDone      = isDone,
                isLocked    = isLocked,
                uniquePeaks = uniquePeaks,
                stats       = stats,
            )
            Spacer(Modifier.height(10.dp))
        }

        TextButton(
            onClick  = onToggle,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                text       = if (expanded) "Ver menos" else "Ver todos los niveles →",
                fontSize   = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color      = if (expanded) MaterialTheme.colorScheme.onSurfaceVariant
                             else MaterialTheme.colorScheme.primary,
            )
        }
    }
}

@Composable
private fun LevelCard(
    def: LocalLevelDef,
    isCurrent: Boolean,
    isDone: Boolean,
    isLocked: Boolean,
    uniquePeaks: Int,
    stats: UserStats,
) {
    val bgColor     = if (isCurrent) Color(0xFFEFF6FF) else Color(0xFFF9FAFB)
    val borderColor = if (isCurrent) Color(0xFFBFDBFE) else Color(0xFFE5E7EB)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
            .clip(RoundedCornerShape(12.dp))
            .background(bgColor)
            .border(1.5.dp, borderColor, RoundedCornerShape(12.dp))
            .alpha(if (isLocked) 0.5f else 1f),
    ) {
        // Left accent bar — current level only
        Box(
            modifier = Modifier
                .width(4.dp)
                .fillMaxHeight()
                .background(if (isCurrent) Color(0xFF0369A1) else Color.Transparent)
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(start = 10.dp, end = 14.dp, top = 10.dp, bottom = 10.dp),
        ) {
            // Top row: badge · emoji+name · ascent pill
            Row(verticalAlignment = Alignment.CenterVertically) {

                // Status badge circle
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                isDone    -> Color(0xFF16A34A)
                                isCurrent -> Color(0xFF0369A1)
                                else      -> Color(0xFFD1D5DB)
                            }
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text       = if (isDone) "✓" else if (isLocked) "🔒" else "${def.idx}",
                        color      = Color.White,
                        fontSize   = if (isLocked) 9.sp else 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                    )
                }

                Spacer(Modifier.width(12.dp))

                // Name
                Text(
                    text          = def.name,
                    fontSize      = 15.sp,
                    fontWeight    = FontWeight.ExtraBold,
                    letterSpacing = (-0.02).em,
                    color         = if (isCurrent) Color(0xFF0369A1) else Color(0xFF111827),
                    modifier      = Modifier.weight(1f),
                    maxLines      = 1,
                    overflow      = TextOverflow.Ellipsis,
                )

                Spacer(Modifier.width(8.dp))

                // Pills: target ascents + altReq
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Pill("${def.targetAscents} cimas")
                    def.altReqs.forEach { r -> Pill("Superar los ${r.threshold}m") }
                }
            }

            // Progress row — in-progress level only
            if (isCurrent) {
                val progress  = (uniquePeaks.toFloat() / def.targetAscents).coerceIn(0f, 1f)
                val pct       = (progress * 100).toInt()
                val remaining = def.targetAscents - uniquePeaks

                Spacer(Modifier.height(12.dp))

                // Progress bar
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(Color(0xFFDBEAFE)),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(progress)
                            .clip(RoundedCornerShape(3.dp))
                            .background(
                                Brush.horizontalGradient(
                                    listOf(Color(0xFF0369A1), Color(0xFF0EA5E9))
                                )
                            ),
                    )
                }

                Spacer(Modifier.height(6.dp))

                Row(
                    modifier              = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text       = "$uniquePeaks / ${def.targetAscents} cimas",
                        fontSize   = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color      = Color(0xFF0369A1),
                    )
                    Text(
                        text       = "$pct%",
                        fontSize   = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color      = Color(0xFF0369A1),
                    )
                }

                if (remaining > 0) {
                    Text(
                        text     = "→ $remaining cima${if (remaining == 1) "" else "s"} más",
                        fontSize = 12.sp,
                        color    = Color(0xFF6B7280),
                    )
                }

                // AltReq hints — show pending requirements
                def.altReqs.filter { r -> getAltCount(stats, r.threshold) < r.count }.forEach { r ->
                    Text(
                        text     = "→ Superar los ${r.threshold} m",
                        fontSize = 12.sp,
                        color    = Color(0xFF6B7280),
                    )
                }
            }
        }
    }
}

// ── Monthly chart ─────────────────────────────────────────────────────────────

@Composable
private fun MonthlyChartSection(bars: List<MonthlyBar>) {
    val periodSummits = remember(bars) { bars.sumOf { it.summits } }
    val periodMeters  = remember(bars) { bars.sumOf { it.metersAscended } }
    val maxSummits    = remember(bars) { bars.maxOfOrNull { it.summits }?.coerceAtLeast(1) ?: 1 }

    ChartCard(
        title = "Últimos 6 meses",
        subtitle = {
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Row {
                    Text("$periodSummits", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0369A1))
                    Text(" cimas", fontSize = 13.sp, color = Color(0xFF6B7280))
                }
                if (periodMeters > 0) {
                    Row {
                        Text("${"%,d".format(periodMeters).replace(',', '.')}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF111827))
                        Text(" m ascendidos", fontSize = 13.sp, color = Color(0xFF6B7280))
                    }
                }
            }
        },
    ) {
        Row(
            modifier              = Modifier.fillMaxWidth(),
            verticalAlignment     = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            bars.forEach { bar ->
                val totalH = if (bar.summits > 0)
                    (bar.summits.toFloat() / maxSummits * 64f).coerceAtLeast(8f).toInt()
                else 3

                val monthLabel = remember(bar.isoMonth) {
                    try {
                        val ym = YearMonth.parse(bar.isoMonth)
                        ym.month.getDisplayName(TextStyle.SHORT, Locale("es"))
                            .replaceFirstChar { it.uppercaseChar() }
                    } catch (e: Exception) { bar.isoMonth.takeLast(2) }
                }

                // Build stacked segments per rarity
                val segments = remember(bar) {
                    if (bar.summits == 0) emptyList()
                    else {
                        val counts = bar.rarityBreakdown.toList()
                        var usedH = 0
                        counts.mapIndexedNotNull { i, count ->
                            if (count == 0) null
                            else {
                                val isLast = counts.drop(i + 1).all { it == 0 }
                                val h = if (isLast) totalH - usedH
                                        else (count.toFloat() / bar.summits * totalH).coerceAtLeast(1f).toInt()
                                usedH += h
                                Pair(RARITIES[i].color, h)
                            }
                        }
                    }
                }

                Column(
                    modifier            = Modifier.weight(1f),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Bottom,
                ) {
                    // Count label above bar
                    Text(
                        text     = if (bar.summits > 0) "${bar.summits}" else "",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color    = if (bar.summits > 0) Color(0xFF0369A1) else Color.Transparent,
                        lineHeight = 12.sp,
                    )
                    Spacer(Modifier.height(3.dp))
                    // Bar (stacked from bottom = reversed in Column)
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(totalH.dp)
                            .clip(RoundedCornerShape(topStart = 3.dp, topEnd = 3.dp)),
                    ) {
                        if (segments.isEmpty()) {
                            Box(Modifier.fillMaxSize().background(Color(0xFFE5E7EB)))
                        } else {
                            segments.reversed().forEach { (color, h) ->
                                Box(Modifier.fillMaxWidth().height(h.dp).background(color))
                            }
                        }
                    }
                    Spacer(Modifier.height(3.dp))
                    // Month label
                    Text(
                        text     = monthLabel,
                        fontSize = 10.sp,
                        color    = Color(0xFF94A3B8),
                    )
                }
            }
        }
    }
}

// ── Rarity chart ───────────────────────────────────────────────────────────────

@Composable
private fun RarityChartSection(breakdown: RarityBreakdown) {
    val values   = remember(breakdown) { breakdown.toList() }
    val maxValue = remember(values) { values.maxOrNull()?.coerceAtLeast(1) ?: 1 }

    ChartCard(title = "Cimas por rareza") {
        Row(
            modifier              = Modifier.fillMaxWidth(),
            verticalAlignment     = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            values.forEachIndexed { i, count ->
                val rarity = RARITIES[i]
                val barH = if (count > 0)
                    (count.toFloat() / maxValue * 96f).coerceAtLeast(8f).toInt()
                else 3
                val isActive = count > 0

                Column(
                    modifier            = Modifier.weight(1f),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    // Count label
                    Text(
                        text       = if (isActive) "$count" else "",
                        fontSize   = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color      = if (isActive) rarity.color else Color.Transparent,
                        lineHeight = 12.sp,
                    )
                    Spacer(Modifier.height(3.dp))
                    // Bar
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(barH.dp)
                            .clip(RoundedCornerShape(topStart = 3.dp, topEnd = 3.dp))
                            .background(if (isActive) rarity.color else Color(0xFFE5E7EB)),
                    )
                    Spacer(Modifier.height(3.dp))
                    // ✿ icon
                    Text(
                        text  = "✿",
                        fontSize = 14.sp,
                        color = if (isActive) rarity.color else Color(0xFFE5E7EB),
                    )
                }
            }
        }
    }
}

// ── Chart card shell ───────────────────────────────────────────────────────────

@Composable
private fun ChartCard(
    title: String,
    subtitle: (@Composable () -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp))
            .padding(16.dp),
    ) {
        Text(
            text       = title,
            style      = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color      = MaterialTheme.colorScheme.onBackground,
        )
        if (subtitle != null) {
            Spacer(Modifier.height(4.dp))
            subtitle()
        }
        Spacer(Modifier.height(16.dp))
        content()
    }
}

// ── Section title ──────────────────────────────────────────────────────────────

@Composable
private fun SectionTitle(title: String) {
    Text(
        text     = title,
        style    = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.Bold,
        color    = MaterialTheme.colorScheme.onBackground,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 20.dp),
    )
}

// ── Leaderboard ────────────────────────────────────────────────────────────────

private fun levelNameForIdx(idx: Int): String =
    LEVEL_DEFS.getOrNull(idx - 1)?.name ?: LEVEL_DEFS.first().name

@Composable
private fun LeaderboardCard(entries: List<LeaderboardEntry>) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp)),
    ) {
        // Column headers
        Row(
            modifier          = Modifier
                .fillMaxWidth()
                .padding(start = 19.dp, end = 16.dp)   // 16 outer + 3 for left border slot
                .padding(top = 10.dp, bottom = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Spacer(Modifier.width(22.dp))  // rank column width
            Spacer(Modifier.weight(1f))    // name takes remaining
            LeaderboardColHeader("Cimas",  Modifier.width(52.dp))
            LeaderboardColHeader("Cairns", Modifier.width(52.dp))
            LeaderboardColHeader("EP",     Modifier.width(44.dp))
        }

        HorizontalDivider(color = MaterialTheme.colorScheme.surfaceVariant)

        entries.take(5).forEachIndexed { index, entry ->
            val rank = index + 1
            if (entry.isCurrentUser) {
                LeaderboardCurrentRow(entry = entry, rank = rank)
            } else {
                LeaderboardOtherRow(entry = entry, rank = rank)
            }
            if (index < minOf(entries.size, 5) - 1) {
                HorizontalDivider(
                    color    = if (entry.isCurrentUser) Color(0xFFDBEAFE)
                               else MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.padding(
                        horizontal = if (entry.isCurrentUser) 0.dp else 16.dp
                    ),
                )
            }
        }
    }
}

@Composable
private fun LeaderboardColHeader(label: String, modifier: Modifier = Modifier) {
    Text(
        text      = label,
        fontSize  = 10.sp,
        color     = Color(0xFF94A3B8),
        fontWeight = FontWeight.SemiBold,
        modifier  = modifier,
        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
    )
}

@Composable
private fun LeaderboardCurrentRow(entry: LeaderboardEntry, rank: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
            .background(
                Brush.horizontalGradient(listOf(Color(0xFFEFF6FF), Color(0xFFF0F9FF)))
            ),
    ) {
        // Left blue border strip
        Box(Modifier.width(3.dp).fillMaxHeight().background(Color(0xFF0369A1)))

        Row(
            modifier          = Modifier
                .weight(1f)
                .padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Rank
            Text(
                text       = "$rank",
                modifier   = Modifier.width(22.dp),
                fontSize   = 13.sp,
                fontWeight = FontWeight.Bold,
                color      = Color(0xFF0369A1),
            )

            // Name + (tú) + level pill
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text       = entry.name,
                        fontSize   = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color      = Color(0xFF0F172A),
                        maxLines   = 1,
                        overflow   = TextOverflow.Ellipsis,
                        modifier   = Modifier.weight(1f, fill = false),
                    )
                    Text(
                        text     = " (tú)",
                        fontSize = 12.sp,
                        color    = Color(0xFF64748B),
                    )
                }
                Spacer(Modifier.height(3.dp))
                LeaderboardLevelPill(entry.levelIdx)
            }

            // Metric columns
            LeaderboardMetricCol(
                value     = "${entry.totalAscents}",
                color     = Color(0xFF0369A1),
                modifier  = Modifier.width(52.dp),
            )
            LeaderboardMetricCol(
                value     = "${entry.cairns}",
                color     = Color(0xFFD97706),
                modifier  = Modifier.width(52.dp),
            )
            LeaderboardMetricCol(
                value     = "${entry.ep}",
                color     = Color(0xFF0369A1),
                modifier  = Modifier.width(44.dp),
            )
        }
    }
}

@Composable
private fun LeaderboardOtherRow(entry: LeaderboardEntry, rank: Int) {
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Rank — light gray, plain number
        Text(
            text       = "$rank",
            modifier   = Modifier.width(22.dp),
            fontSize   = 13.sp,
            fontWeight = FontWeight.Bold,
            color      = Color(0xFFD1D5DB),
        )

        // Name + level pill
        Column(Modifier.weight(1f)) {
            Text(
                text       = entry.name,
                fontSize   = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color      = Color(0xFF111827),
                maxLines   = 1,
                overflow   = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(3.dp))
            LeaderboardLevelPill(entry.levelIdx)
        }

        // Metric columns
        LeaderboardMetricCol(
            value    = "${entry.totalAscents}",
            color    = Color(0xFF374151),
            modifier = Modifier.width(52.dp),
        )
        LeaderboardMetricCol(
            value    = "${entry.cairns}",
            color    = Color(0xFFD97706),
            modifier = Modifier.width(52.dp),
        )
        LeaderboardMetricCol(
            value    = "${entry.ep}",
            color    = Color(0xFF374151),
            modifier = Modifier.width(44.dp),
        )
    }
}

@Composable
private fun LeaderboardLevelPill(levelIdx: Int) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(Color(0xFFF3F4F6))
            .padding(horizontal = 6.dp, vertical = 2.dp),
    ) {
        Text(
            text       = levelNameForIdx(levelIdx),
            fontSize   = 10.sp,
            fontWeight = FontWeight.Bold,
            color      = Color(0xFF374151),
        )
    }
}

@Composable
private fun LeaderboardMetricCol(value: String, color: Color, modifier: Modifier = Modifier) {
    Column(
        modifier            = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text       = value,
            fontSize   = 14.sp,
            fontWeight = FontWeight.ExtraBold,
            color      = color,
            lineHeight = 16.sp,
            textAlign  = androidx.compose.ui.text.style.TextAlign.Center,
        )
    }
}

// ── No friends CTA ─────────────────────────────────────────────────────────────

@Composable
private fun NoFriendsCta() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 20.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(Brush.linearGradient(listOf(Color(0xFFEFF6FF), Color(0xFFF0F9FF))))
            .border(BorderStroke(1.5.dp, Color(0xFFBFDBFE)), RoundedCornerShape(12.dp))
            .padding(22.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("👥", fontSize = 36.sp)
        Spacer(Modifier.height(8.dp))
        Text(
            text       = "¡Compite con tus amigos!",
            fontSize   = 15.sp,
            fontWeight = FontWeight.Bold,
            color      = Color(0xFF111827),
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text       = "Invita a amigos para ver tu posición en la cordada.",
            fontSize   = 13.sp,
            color      = Color(0xFF6B7280),
            lineHeight = 18.sp,
        )
        Spacer(Modifier.height(14.dp))
        Button(
            onClick = { /* Phase 5 */ },
            colors  = ButtonDefaults.buttonColors(containerColor = Color(0xFF0369A1)),
            shape   = RoundedCornerShape(8.dp),
        ) {
            Text("Invitar amigos", fontWeight = FontWeight.SemiBold)
        }
    }
}

// ── Recent ascents ─────────────────────────────────────────────────────────────

@Composable
private fun RecentAscentsRow(ascents: List<RecentAscentSummary>) {
    LazyRow(
        contentPadding        = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(ascents.take(8)) { RecentAscentCard(it) }
    }
}

@Composable
private fun RecentAscentCard(ascent: RecentAscentSummary) {
    Column(
        modifier = Modifier
            .width(150.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(12.dp)),
    ) {
        // Photo area
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp)
                .background(MaterialTheme.colorScheme.surfaceVariant),
        ) {
            if (ascent.photoUrl != null) {
                AsyncImage(
                    model              = ascent.photoUrl,
                    contentDescription = ascent.peakName,
                    contentScale       = ContentScale.Crop,
                    modifier           = Modifier.fillMaxSize(),
                )
            } else {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("🏔️", fontSize = 40.sp)
                }
            }
            // Gradient overlay with peak info
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomStart)
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Transparent, Color(0xA6000000))
                        )
                    )
                    .padding(horizontal = 8.dp, vertical = 7.dp),
            ) {
                Column {
                    Text(
                        text       = ascent.peakName,
                        fontSize   = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color      = Color.White,
                        maxLines   = 1,
                        overflow   = TextOverflow.Ellipsis,
                    )
                    Text(
                        text  = "${ascent.altitudeM} m",
                        fontSize = 10.sp,
                        color = Color.White.copy(alpha = 0.8f),
                        fontWeight = FontWeight.Medium,
                    )
                }
            }
        }
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

@Composable
private fun Pill(text: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(Color(0xFFF3F4F6))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(text = text, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF374151))
    }
}

private fun initials(name: String): String {
    val parts = name.trim().split(" ")
    return if (parts.size >= 2)
        "${parts.first().first()}${parts.last().first()}".uppercase()
    else
        name.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
}

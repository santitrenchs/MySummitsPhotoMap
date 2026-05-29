package com.peakadex.app.feature.home

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.foundation.Canvas
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
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
import com.peakadex.app.core.ui.RARITY_PALETTE
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
    LocalLevelDef(2, "🌱", "Scout",    20,  listOf(AltReq(2000, 1))),
    LocalLevelDef(3, "🥾", "Guide",    50,  listOf(AltReq(3000, 1))),
    LocalLevelDef(4, "🧭", "Explorer", 100, listOf(AltReq(4000, 1))),
    LocalLevelDef(5, "⛰️", "Alpinist", 150, listOf(AltReq(5000, 1))),
    LocalLevelDef(6, "🏔️", "Master",   220, listOf(AltReq(6500, 1))),
    LocalLevelDef(7, "👑", "Zenith",   300, listOf(AltReq(8000, 1))),
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
fun HomeScreen(
    onNavigateToCardsWithRarity: (rarityId: String) -> Unit = {},
    vm: HomeViewModel = viewModel(),
) {
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
                HomeContent(data = s.data, user = user, onNavigateToCardsWithRarity = onNavigateToCardsWithRarity)
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
        Button(onClick = onRetry) { Text(stringResource(R.string.action_retry)) }
    }
}

// ── Main content ───────────────────────────────────────────────────────────────

@Composable
private fun HomeContent(
    data: HomeData,
    user: User?,
    onNavigateToCardsWithRarity: (rarityId: String) -> Unit = {},
) {
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
            item { MonthlyChartSection(data.monthlyStats, onNavigateToCardsWithRarity) }
        }

        // 5 — Rarity chart (≥1 ascent)
        if (data.stats.totalAscents >= 1) {
            item { RarityChartSection(data.stats.rarityBreakdown, onNavigateToCardsWithRarity) }
        }

        // 7 — Leaderboard
        if (data.leaderboard.size > 1) {
            item { SectionTitle(stringResource(R.string.home_section_leaderboard)) }
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
                        text  = stringResource(R.string.home_section_last_peaks),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                    Text(
                        text  = stringResource(R.string.home_see_all_btn),
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
        // ── Full-card illustration — fills entire hero ────────────────────
        Image(
            painter            = painterResource(R.drawable.hero),
            contentDescription = null,
            contentScale       = ContentScale.Crop,
            alignment          = BiasAlignment(0f, 0.5f),
            modifier           = Modifier
                .fillMaxWidth()
                .matchParentSize()
                .background(Color(0xFF1C2D3F)),
        )

        // ── Dark gradient overlay for text readability ────────────────────
        Box(
            modifier = Modifier
                .matchParentSize()
                .background(
                    Brush.verticalGradient(
                        colorStops = arrayOf(
                            0.00f to Color(0x33000000),
                            0.45f to Color(0x66000000),
                            1.00f to Color(0xCC000000),
                        )
                    )
                )
        )

        // ── All content ───────────────────────────────────────────────────
        // Compute level progress here so the hero can show the bar
        val heroStats        = data.stats
        val heroUniquePeaks  = heroStats.uniquePeaks
        val heroLevelIdx     = run {
            var idx = 0
            for (i in LEVEL_DEFS.indices) {
                if (meetsLevel(LEVEL_DEFS[i], heroUniquePeaks, heroStats)) idx = i else break
            }
            idx
        }
        val heroCurrent  = LEVEL_DEFS[heroLevelIdx]
        val heroNext     = if (heroLevelIdx < LEVEL_DEFS.lastIndex) LEVEL_DEFS[heroLevelIdx + 1] else null
        val heroPrevTgt  = if (heroLevelIdx > 0) LEVEL_DEFS[heroLevelIdx - 1].targetAscents else 0
        val heroTarget   = heroNext?.targetAscents ?: heroCurrent.targetAscents
        val heroProgress = if (heroTarget > heroPrevTgt)
            ((heroUniquePeaks - heroPrevTgt).coerceAtLeast(0).toFloat() / (heroTarget - heroPrevTgt)).coerceIn(0f, 1f)
        else 1f
        val heroAltReqLabel = heroNext?.let { next ->
            val alt = next.altReqs.firstOrNull()
            if (alt != null) "Superar ${alt.threshold}m para ${next.name}"
            else "para ${next.name}"
        }

        Column(modifier = Modifier.fillMaxWidth()) {
        // — Main padded content —
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 12.dp),
        ) {
            // Top row: avatar + name/level + cairns/EP — all vertically centered
            Row(
                modifier          = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Avatar with drop shadow via outer Box
                Box(
                    modifier = Modifier
                        .shadow(elevation = 8.dp, shape = CircleShape, ambientColor = Color.Black, spotColor = Color.Black)
                        .size(56.dp)
                        .clip(CircleShape)
                        .border(2.dp, Color(0xBFFFFFFF), CircleShape)
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
                            fontSize   = 20.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }

                Spacer(Modifier.width(12.dp))

                // Name + level (left, grows)
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text          = displayName,
                        fontSize      = 18.sp,
                        fontWeight    = FontWeight.Bold,
                        color         = Color.White,
                        letterSpacing = (-0.03).em,
                        lineHeight    = (18 * 1.15).sp,
                        maxLines      = 1,
                        overflow      = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                    )
                    Spacer(Modifier.height(5.dp))
                    // CS pill + EP pill side by side (replace level pill)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        // CS pill — amber
                        Row(
                            modifier              = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(Color(0xE6222222))
                                .padding(horizontal = 9.dp, vertical = 4.dp),
                            verticalAlignment     = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Canvas(modifier = Modifier.size(width = 11.dp, height = 10.dp)) {
                                val w = size.width; val h = size.height
                                val amber = Color(0xFFF59E0B)
                                drawPath(Path().apply { moveTo(w*0.05f,h); lineTo(w*0.95f,h); lineTo(w*0.82f,h*0.72f); lineTo(w*0.18f,h*0.72f); close() }, color = amber)
                                drawPath(Path().apply { moveTo(w*0.18f,h*0.68f); lineTo(w*0.82f,h*0.68f); lineTo(w*0.70f,h*0.40f); lineTo(w*0.30f,h*0.40f); close() }, color = amber)
                                drawPath(Path().apply { moveTo(w*0.30f,h*0.36f); lineTo(w*0.70f,h*0.36f); lineTo(w*0.58f,h*0.04f); lineTo(w*0.42f,h*0.04f); close() }, color = amber)
                            }
                            Text(
                                text       = if (meEntry != null) "$myCairns CS" else "0 CS",
                                fontSize   = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color      = Color(0xFFFBBF24),
                            )
                        }
                        // EP pill — white
                        Row(
                            modifier              = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(Color(0xE6222222))
                                .padding(horizontal = 9.dp, vertical = 4.dp),
                            verticalAlignment     = Alignment.CenterVertically,
                        ) {
                            Text(
                                text       = if (meEntry != null) "$myEp EP" else "0 EP",
                                fontSize   = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color      = Color.White,
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            // Divider
            Box(Modifier.fillMaxWidth().height(1.dp).background(Color(0x1AFFFFFF)))

            Spacer(Modifier.height(8.dp))

            // Metrics row: Ascensiones | Cimas | Alt. máx
            Row(
                modifier              = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment     = Alignment.CenterVertically,
            ) {
                MetricCell(
                    value = "${data.stats.totalAscents}",
                    label = stringResource(R.string.home_stat_ascents_label),
                )
                Box(Modifier.width(1.dp).height(32.dp).background(Color(0x26FFFFFF)))
                MetricCell(
                    value = "${data.stats.uniquePeaks}",
                    label = stringResource(R.string.home_stat_peaks_label),
                )
                Box(Modifier.width(1.dp).height(32.dp).background(Color(0x26FFFFFF)))
                MetricCell(
                    value = if (data.stats.maxAltitude > 0) "${data.stats.maxAltitude}" else "—",
                    label = stringResource(R.string.home_stat_max_alt_label),
                    unit  = if (data.stats.maxAltitude > 0) "m" else null,
                )
            }
        } // end main padded Column

        // ── Progress strip — solid black, full width ──────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF000000))
                .padding(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 14.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                // Label: count left-aligned
                Text(
                    text       = "$heroUniquePeaks / $heroTarget",
                    fontSize   = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color      = Color.White,
                )
                // Alt req left-aligned below count
                if (heroAltReqLabel != null) {
                    Text(
                        text     = heroAltReqLabel,
                        fontSize = 12.sp,
                        color    = Color(0xFF94A3B8),
                    )
                }
                // Progress bar — no text inside, 9dp height (50% thinner)
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(9.dp)
                        .clip(RoundedCornerShape(5.dp))
                        .background(Color(0xFF334155)),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(heroProgress)
                            .clip(RoundedCornerShape(5.dp))
                            .background(
                                Brush.horizontalGradient(
                                    colors = listOf(Color(0xFF60A5FA), Color(0xFF3B82F6)),
                                )
                            ),
                    )
                }
            }
        }
        } // end outer Column wrapping hero content
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
            fontSize = 11.sp,
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
            text       = stringResource(R.string.home_empty_ascents_desc),
            fontSize   = 14.sp,
            color      = Color(0xFF166534),
            lineHeight = 20.sp,
        )
        Spacer(Modifier.height(20.dp))
        Button(
            onClick = { /* Phase 4 — tap FAB */ },
            colors  = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A)),
        ) {
            Text(stringResource(R.string.home_register_ascent_btn), fontWeight = FontWeight.Bold)
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
                text       = if (expanded) stringResource(R.string.home_levels_see_less) else stringResource(R.string.home_levels_see_all),
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
    val bgColor     = if (isCurrent) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
    val borderColor = if (isCurrent) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.outline

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
                .background(if (isCurrent) MaterialTheme.colorScheme.primary else Color.Transparent)
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(start = 10.dp, end = 14.dp, top = 10.dp, bottom = 10.dp),
        ) {
            // Top row: badge · name
            Row(verticalAlignment = Alignment.CenterVertically) {

                // Status badge circle
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                isDone    -> Color(0xFF16A34A)
                                isCurrent -> MaterialTheme.colorScheme.primary
                                else      -> MaterialTheme.colorScheme.outlineVariant
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

                // Name — full width, no ellipsis needed
                Text(
                    text       = def.name,
                    style      = MaterialTheme.typography.titleMedium,
                    color      = if (isCurrent) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                    modifier   = Modifier.weight(1f),
                    softWrap   = true,
                    maxLines   = 2,
                    overflow   = TextOverflow.Ellipsis,
                )
            }

            // Pills row: target ascents + altReq (below name, left-aligned)
            Spacer(Modifier.height(6.dp))
            Row(
                modifier             = Modifier.padding(start = 40.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Pill(pluralStringResource(R.plurals.home_level_req_ascents_pill, def.targetAscents, def.targetAscents))
                def.altReqs.forEach { r -> Pill(stringResource(R.string.home_level_req_altitude, r.threshold)) }
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
                        .background(MaterialTheme.colorScheme.primaryContainer),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(progress)
                            .clip(RoundedCornerShape(3.dp))
                            .background(
                                Brush.horizontalGradient(
                                    listOf(MaterialTheme.colorScheme.primary, Color(0xFF0EA5E9))
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
                        text       = stringResource(R.string.home_level_progress_peaks, uniquePeaks, def.targetAscents),
                        fontSize   = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color      = MaterialTheme.colorScheme.primary,
                    )
                    Text(
                        text       = "$pct%",
                        fontSize   = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color      = MaterialTheme.colorScheme.primary,
                    )
                }

                if (remaining > 0) {
                    Text(
                        text     = pluralStringResource(R.plurals.home_level_remaining_peaks, remaining, remaining),
                        fontSize = 12.sp,
                        color    = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                // AltReq hints — show pending requirements
                def.altReqs.filter { r -> getAltCount(stats, r.threshold) < r.count }.forEach { r ->
                    Text(
                        text     = stringResource(R.string.home_level_req_altitude_progress, r.threshold),
                        fontSize = 12.sp,
                        color    = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

// ── Monthly chart ─────────────────────────────────────────────────────────────

private data class BarSegment(val rarityId: String, val color: Color, val heightDp: Int)

@Composable
private fun MonthlyChartSection(
    bars: List<MonthlyBar>,
    onNavigateToCardsWithRarity: (rarityId: String) -> Unit = {},
) {
    val periodSummits = remember(bars) { bars.sumOf { it.summits } }
    val periodMeters  = remember(bars) { bars.sumOf { it.metersAscended } }
    val maxSummits    = remember(bars) { bars.maxOfOrNull { it.summits }?.coerceAtLeast(1) ?: 1 }

    ChartCard(
        title = stringResource(R.string.home_chart_6months_title),
        subtitle = {
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Row {
                    Text("$periodSummits", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    Text(stringResource(R.string.home_period_peaks_suffix), fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (periodMeters > 0) {
                    Row {
                        Text("${"%,d".format(periodMeters).replace(',', '.')}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                        Text(stringResource(R.string.home_period_meters_suffix), fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                        ym.month.getDisplayName(TextStyle.SHORT, Locale.getDefault())
                            .replaceFirstChar { it.uppercaseChar() }
                    } catch (e: Exception) { bar.isoMonth.takeLast(2) }
                }

                // Build stacked segments per rarity — include rarityId for tappable navigation
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
                                BarSegment(RARITY_PALETTE[i].id, RARITY_PALETTE[i].color, h)
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
                        color    = if (bar.summits > 0) MaterialTheme.colorScheme.primary else Color.Transparent,
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
                            Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.surfaceVariant))
                        } else {
                            segments.reversed().forEach { seg ->
                                Box(
                                    Modifier
                                        .fillMaxWidth()
                                        .height(seg.heightDp.dp)
                                        .background(seg.color)
                                        .clickable(
                                            indication      = null,
                                            interactionSource = remember { MutableInteractionSource() },
                                        ) { onNavigateToCardsWithRarity(seg.rarityId) },
                                )
                            }
                        }
                    }
                    Spacer(Modifier.height(3.dp))
                    // Month label
                    Text(
                        text     = monthLabel,
                        fontSize = 10.sp,
                        color    = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

// ── Rarity chart ───────────────────────────────────────────────────────────────

@Composable
private fun RarityChartSection(
    breakdown: RarityBreakdown,
    onNavigateToCardsWithRarity: (rarityId: String) -> Unit = {},
) {
    val values   = remember(breakdown) { breakdown.toList() }
    val maxValue = remember(values) { values.maxOrNull()?.coerceAtLeast(1) ?: 1 }

    ChartCard(title = stringResource(R.string.home_chart_rarity_title)) {
        Row(
            modifier              = Modifier.fillMaxWidth(),
            verticalAlignment     = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            values.forEachIndexed { i, count ->
                val rarity   = RARITY_PALETTE[i]
                val barH     = if (count > 0)
                    (count.toFloat() / maxValue * 96f).coerceAtLeast(8f).toInt()
                else 3
                val isActive = count > 0

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .then(
                            if (isActive) Modifier.clickable(
                                indication        = null,
                                interactionSource = remember { MutableInteractionSource() },
                            ) { onNavigateToCardsWithRarity(rarity.id) }
                            else Modifier
                        ),
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
                            .background(if (isActive) rarity.color else MaterialTheme.colorScheme.surfaceVariant),
                    )
                    Spacer(Modifier.height(3.dp))
                    // ✿ icon
                    Text(
                        text     = "✿",
                        fontSize = 14.sp,
                        color    = if (isActive) rarity.color else Color(0xFFE5E7EB),
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
    OutlinedCard(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = MaterialTheme.shapes.large,
    ) {
        Column(Modifier.padding(16.dp)) {
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
    OutlinedCard(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = MaterialTheme.shapes.large,
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
            LeaderboardColHeader(stringResource(R.string.home_leaderboard_col_peaks),  Modifier.width(52.dp))
            LeaderboardColHeader(stringResource(R.string.home_leaderboard_col_cairns), Modifier.width(52.dp))
            LeaderboardColHeader(stringResource(R.string.home_leaderboard_col_ep),     Modifier.width(44.dp))
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
                    color    = if (entry.isCurrentUser) MaterialTheme.colorScheme.primaryContainer
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
        color     = MaterialTheme.colorScheme.onSurfaceVariant,
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
                Brush.horizontalGradient(listOf(MaterialTheme.colorScheme.primaryContainer, MaterialTheme.colorScheme.primaryContainer))
            ),
    ) {
        // Left blue border strip
        Box(Modifier.width(3.dp).fillMaxHeight().background(MaterialTheme.colorScheme.primary))

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
                color      = MaterialTheme.colorScheme.primary,
            )

            // Name + (tú) + level pill
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text       = entry.name,
                        fontSize   = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color      = MaterialTheme.colorScheme.onSurface,
                        maxLines   = 1,
                        overflow   = TextOverflow.Ellipsis,
                        modifier   = Modifier.weight(1f, fill = false),
                    )
                    Text(
                        text     = stringResource(R.string.home_leaderboard_you),
                        fontSize = 12.sp,
                        color    = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Spacer(Modifier.height(3.dp))
                LeaderboardLevelPill(entry.levelIdx)
            }

            // Metric columns
            LeaderboardMetricCol(
                value     = "${entry.totalAscents}",
                color     = MaterialTheme.colorScheme.primary,
                modifier  = Modifier.width(52.dp),
            )
            LeaderboardMetricCol(
                value     = "${entry.cairns}",
                color     = Color(0xFFD97706),
                modifier  = Modifier.width(52.dp),
            )
            LeaderboardMetricCol(
                value     = "${entry.ep}",
                color     = MaterialTheme.colorScheme.primary,
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
            color      = MaterialTheme.colorScheme.outlineVariant,
        )

        // Name + level pill
        Column(Modifier.weight(1f)) {
            Text(
                text       = entry.name,
                fontSize   = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color      = MaterialTheme.colorScheme.onSurface,
                maxLines   = 1,
                overflow   = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(3.dp))
            LeaderboardLevelPill(entry.levelIdx)
        }

        // Metric columns
        LeaderboardMetricCol(
            value    = "${entry.totalAscents}",
            color    = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.width(52.dp),
        )
        LeaderboardMetricCol(
            value    = "${entry.cairns}",
            color    = Color(0xFFD97706),
            modifier = Modifier.width(52.dp),
        )
        LeaderboardMetricCol(
            value    = "${entry.ep}",
            color    = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.width(44.dp),
        )
    }
}

@Composable
private fun LeaderboardLevelPill(levelIdx: Int) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = 6.dp, vertical = 2.dp),
    ) {
        Text(
            text       = levelNameForIdx(levelIdx),
            fontSize   = 10.sp,
            fontWeight = FontWeight.Bold,
            color      = MaterialTheme.colorScheme.onSurface,
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
            .background(Brush.linearGradient(listOf(MaterialTheme.colorScheme.primaryContainer, MaterialTheme.colorScheme.primaryContainer)))
            .border(BorderStroke(1.5.dp, MaterialTheme.colorScheme.primaryContainer), RoundedCornerShape(12.dp))
            .padding(22.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("👥", fontSize = 36.sp)
        Spacer(Modifier.height(8.dp))
        Text(
            text  = stringResource(R.string.home_no_friends_title),
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text       = stringResource(R.string.home_no_friends_desc),
            fontSize   = 13.sp,
            color      = MaterialTheme.colorScheme.onSurfaceVariant,
            lineHeight = 18.sp,
        )
        Spacer(Modifier.height(14.dp))
        Button(
            onClick = { /* Phase 5 */ },
            colors  = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
        ) {
            Text(stringResource(R.string.home_invite_friends_btn), fontWeight = FontWeight.SemiBold)
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
    OutlinedCard(modifier = Modifier.width(150.dp)) {
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
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(text = text, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
    }
}

private fun initials(name: String): String {
    val parts = name.trim().split(" ")
    return if (parts.size >= 2)
        "${parts.first().first()}${parts.last().first()}".uppercase()
    else
        name.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
}

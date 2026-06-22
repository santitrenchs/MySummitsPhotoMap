package com.peakadex.app.feature.home

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathBuilder
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
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
import com.peakadex.app.core.ui.LEVEL_DEFS
import com.peakadex.app.core.ui.LevelDef
import com.peakadex.app.core.ui.levelName
import com.peakadex.app.feature.friends.CairnIcon
import com.peakadex.app.feature.friends.FriendsDivider
import com.peakadex.app.feature.friends.FriendsTextMuted
import com.peakadex.app.feature.friends.FriendsTextPrimary
import com.peakadex.app.feature.friends.FriendsTextSecondary
import com.peakadex.app.feature.friends.UserAvatar
import com.peakadex.app.core.ui.FirstCardOnboardingBanner
import com.peakadex.app.core.ui.UiText
import com.peakadex.app.core.ui.theme.PeakGreenCTA
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale

// ── Level definitions — mirrors lib/level-utils.ts exactly ───────────────────
//
// 6 levels. Progress measured in uniquePeaks (distinct summits), not totalAscents.
// Scout (idx=1) is the base level — no requirements, everyone starts here.
// Each subsequent level requires BOTH unique peaks AND ≥1 peak above the altitude threshold.
// Keep in sync with lib/level-utils.ts LEVEL_DEFS (server is the source of truth for levelIdx).

// Level definitions (names, emojis, thresholds, accent colours) live in the shared
// single source of truth: core/ui/LevelDefs.kt → LEVEL_DEFS. The server owns the
// computed 1-based levelIdx; these helpers only display / compute progression.

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
private fun meetsLevel(def: LevelDef, uniquePeaks: Int, stats: UserStats): Boolean {
    if (uniquePeaks < def.targetPeaks) return false
    return def.altReqs.all { r -> getAltCount(stats, r.threshold) >= r.count }
}

// ── Entry point ────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToCardsWithRarity: (rarityId: String) -> Unit = {},
    onNavigateToFriends: () -> Unit = {},
    onCaptureFirstSummit: () -> Unit = {},
    vm: HomeViewModel = viewModel(),
) {
    val state        by vm.uiState.collectAsStateWithLifecycle()
    val isRefreshing by vm.isRefreshing.collectAsStateWithLifecycle()
    val user         by AppContainer.authSession.currentUser.collectAsStateWithLifecycle()

    when (val s = state) {
        is HomeUiState.Loading -> HomeLoadingState()
        is HomeUiState.Error   -> HomeErrorState(s.message.asString()) { vm.load() }
        is HomeUiState.Success -> {
            PullToRefreshBox(
                isRefreshing = isRefreshing,
                onRefresh    = { vm.refresh() },
                modifier     = Modifier.fillMaxSize(),
            ) {
                HomeContent(data = s.data, user = user, onNavigateToCardsWithRarity = onNavigateToCardsWithRarity, onNavigateToFriends = onNavigateToFriends, onCaptureFirstSummit = onCaptureFirstSummit)
            }
        }
    }
}

// ── Loading / Error ────────────────────────────────────────────────────────────

@Composable
private fun HomeLoadingState() {
    val shimmer = rememberSkeletonBrush()

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 32.dp),
    ) {
        item { HeroHeaderSkeleton(shimmer) }
        item { FriendsRankingSkeleton(shimmer) }
        item { MonthlyChartSkeleton(shimmer) }
        item { RarityChartSkeleton(shimmer) }
        item { RecentAscentsSkeleton(shimmer) }
    }
}

@Composable
private fun rememberSkeletonBrush(): Brush {
    val transition = rememberInfiniteTransition(label = "homeSkeleton")
    val x by transition.animateFloat(
        initialValue = -350f,
        targetValue = 1100f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200),
            repeatMode = RepeatMode.Restart,
        ),
        label = "homeSkeletonShimmer",
    )
    val base = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.62f)
    val highlight = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.95f)
    return Brush.linearGradient(
        colors = listOf(base, highlight, base),
        start = Offset(x, 0f),
        end = Offset(x + 350f, 0f),
    )
}

@Composable
private fun SkeletonBlock(
    brush: Brush,
    modifier: Modifier,
    shape: RoundedCornerShape = RoundedCornerShape(8.dp),
) {
    Box(
        modifier = modifier
            .clip(shape)
            .background(brush),
    )
}

@Composable
private fun HeroHeaderSkeleton(brush: Brush) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 12.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface),
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 12.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    SkeletonBlock(
                        brush = brush,
                        modifier = Modifier.size(56.dp),
                        shape = RoundedCornerShape(28.dp),
                    )
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        SkeletonBlock(brush, Modifier.fillMaxWidth(0.72f).height(20.dp))
                        Spacer(Modifier.height(7.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            SkeletonBlock(brush, Modifier.width(72.dp).height(24.dp), RoundedCornerShape(20.dp))
                            SkeletonBlock(brush, Modifier.width(64.dp).height(24.dp), RoundedCornerShape(20.dp))
                        }
                    }
                }

                Spacer(Modifier.height(8.dp))
                Box(Modifier.fillMaxWidth().height(1.dp).background(MaterialTheme.colorScheme.outlineVariant))
                Spacer(Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    MetricSkeleton(brush)
                    Box(Modifier.width(1.dp).height(32.dp).background(MaterialTheme.colorScheme.outlineVariant))
                    MetricSkeleton(brush)
                    Box(Modifier.width(1.dp).height(32.dp).background(MaterialTheme.colorScheme.outlineVariant))
                    MetricSkeleton(brush)
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 14.dp),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    SkeletonBlock(brush, Modifier.fillMaxWidth(0.82f).height(14.dp))
                    SkeletonBlock(brush, Modifier.fillMaxWidth().height(9.dp), RoundedCornerShape(5.dp))
                }
            }
        }
    }
}

@Composable
private fun MetricSkeleton(brush: Brush) {
    Column(
        modifier = Modifier.padding(horizontal = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        SkeletonBlock(brush, Modifier.width(34.dp).height(20.dp))
        Spacer(Modifier.height(4.dp))
        SkeletonBlock(brush, Modifier.width(54.dp).height(11.dp))
    }
}

@Composable
private fun FriendsRankingSkeleton(brush: Brush) {
    OutlinedCard(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = MaterialTheme.shapes.large,
    ) {
        Column {
            SkeletonBlock(
                brush = brush,
                modifier = Modifier
                    .padding(horizontal = 16.dp, vertical = 12.dp)
                    .width(116.dp)
                    .height(18.dp),
            )
            HorizontalDivider(color = FriendsDivider)
            repeat(3) { index ->
                FriendRankRowSkeleton(brush)
                if (index < 2) {
                    HorizontalDivider(color = FriendsDivider, modifier = Modifier.padding(start = 76.dp))
                }
            }
        }
    }
}

@Composable
private fun FriendRankRowSkeleton(brush: Brush) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        SkeletonBlock(brush, Modifier.size(width = 30.dp, height = 44.dp), RoundedCornerShape(10.dp))
        SkeletonBlock(brush, Modifier.size(52.dp), RoundedCornerShape(26.dp))
        Column(Modifier.weight(1f)) {
            SkeletonBlock(brush, Modifier.fillMaxWidth(0.62f).height(16.dp))
            Spacer(Modifier.height(6.dp))
            SkeletonBlock(brush, Modifier.fillMaxWidth(0.34f).height(12.dp))
            Spacer(Modifier.height(6.dp))
            SkeletonBlock(brush, Modifier.fillMaxWidth(0.76f).height(12.dp))
        }
    }
}

@Composable
private fun MonthlyChartSkeleton(brush: Brush) {
    ChartSkeletonShell(brush, titleWidth = 150.dp, subtitle = true) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            val heights = listOf(24.dp, 48.dp, 36.dp, 64.dp, 18.dp, 52.dp)
            heights.forEach { height ->
                Column(
                    modifier = Modifier.weight(1f),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Bottom,
                ) {
                    SkeletonBlock(brush, Modifier.width(18.dp).height(10.dp))
                    Spacer(Modifier.height(4.dp))
                    SkeletonBlock(
                        brush = brush,
                        modifier = Modifier.fillMaxWidth().height(height),
                        shape = RoundedCornerShape(topStart = 3.dp, topEnd = 3.dp),
                    )
                    Spacer(Modifier.height(5.dp))
                    SkeletonBlock(brush, Modifier.width(26.dp).height(10.dp))
                }
            }
        }
    }
}

@Composable
private fun RarityChartSkeleton(brush: Brush) {
    ChartSkeletonShell(brush, titleWidth = 132.dp, subtitle = false) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            val heights = listOf(18.dp, 38.dp, 78.dp, 48.dp, 96.dp, 26.dp, 64.dp, 34.dp, 58.dp)
            heights.forEach { height ->
                Column(
                    modifier = Modifier.weight(1f),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    SkeletonBlock(brush, Modifier.width(16.dp).height(10.dp))
                    Spacer(Modifier.height(4.dp))
                    SkeletonBlock(
                        brush = brush,
                        modifier = Modifier.fillMaxWidth().height(height),
                        shape = RoundedCornerShape(topStart = 3.dp, topEnd = 3.dp),
                    )
                    Spacer(Modifier.height(5.dp))
                    SkeletonBlock(brush, Modifier.size(14.dp), RoundedCornerShape(7.dp))
                }
            }
        }
    }
}

@Composable
private fun ChartSkeletonShell(
    brush: Brush,
    titleWidth: Dp,
    subtitle: Boolean,
    content: @Composable () -> Unit,
) {
    OutlinedCard(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = MaterialTheme.shapes.large,
    ) {
        Column(Modifier.padding(16.dp)) {
            SkeletonBlock(brush, Modifier.width(titleWidth).height(19.dp))
            if (subtitle) {
                Spacer(Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    SkeletonBlock(brush, Modifier.width(64.dp).height(13.dp))
                    SkeletonBlock(brush, Modifier.width(92.dp).height(13.dp))
                }
            }
            Spacer(Modifier.height(16.dp))
            content()
        }
    }
}

@Composable
private fun RecentAscentsSkeleton(brush: Brush) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(top = 24.dp, bottom = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        SkeletonBlock(brush, Modifier.width(132.dp).height(20.dp))
        SkeletonBlock(brush, Modifier.width(54.dp).height(14.dp))
    }

    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(4) {
            OutlinedCard(modifier = Modifier.width(150.dp)) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp)
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                ) {
                    SkeletonBlock(brush, Modifier.fillMaxSize(), RoundedCornerShape(0.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .align(Alignment.BottomStart)
                            .background(Brush.verticalGradient(listOf(Color.Transparent, Color(0xA6000000))))
                            .padding(horizontal = 8.dp, vertical = 7.dp),
                    ) {
                        Column {
                            SkeletonBlock(brush, Modifier.fillMaxWidth(0.72f).height(12.dp))
                            Spacer(Modifier.height(5.dp))
                            SkeletonBlock(brush, Modifier.width(46.dp).height(10.dp))
                        }
                    }
                }
            }
        }
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
    onNavigateToFriends: () -> Unit = {},
    onCaptureFirstSummit: () -> Unit = {},
) {
    LazyColumn(contentPadding = PaddingValues(bottom = 32.dp)) {

        // 1 — Hero header
        item { HeroHeader(data = data, user = user) }

        // 2 — Cordada ranking (friends leaderboard, shown first)
        if (data.leaderboard.size > 1) {
            item { FriendsRankingSection(data.leaderboard) }
        }

        // 3 — Onboarding (new users)
        if (data.stats.totalAscents == 0) {
            item { FirstCardOnboardingBanner(onCapture = onCaptureFirstSummit) }
        }

        // 4 — Monthly chart (≥1 ascent)
        if (data.stats.totalAscents >= 1 && data.monthlyStats.isNotEmpty()) {
            item { MonthlyChartSection(data.monthlyStats, onNavigateToCardsWithRarity) }
        }

        // 5 — Rarity chart (≥1 ascent)
        if (data.stats.totalAscents >= 1) {
            item { RarityChartSection(data.stats.rarityBreakdown, onNavigateToCardsWithRarity) }
        }

        // 6 — Solo ranking (no friends yet)
        if (data.stats.totalFriends == 0 && data.leaderboard.isNotEmpty()) {
            item { SoloRankingSection(meEntry = data.leaderboard.first { it.isCurrentUser }, onInvite = onNavigateToFriends) }
        }

        // 7 — Recent ascents
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
                            0.00f to Color(0x22000000),
                            0.50f to Color(0x88000000),
                            1.00f to Color(0xFF000000),
                        )
                    )
                )
        )

        // ── All content ───────────────────────────────────────────────────
        // Use levelIdx from the server (user_stats) — single source of truth.
        // LEVEL_DEFS local list is 0-indexed; server levelIdx is 1-based (1=Scout…6=Zenith).
        val heroStats        = data.stats
        val heroUniquePeaks  = heroStats.uniquePeaks
        val heroLevelIdx     = (heroStats.levelIdx - 1).coerceIn(0, LEVEL_DEFS.lastIndex)
        val heroCurrent  = LEVEL_DEFS[heroLevelIdx]
        val heroNext     = if (heroLevelIdx < LEVEL_DEFS.lastIndex) LEVEL_DEFS[heroLevelIdx + 1] else null
        val heroPrevTgt  = if (heroLevelIdx > 0) LEVEL_DEFS[heroLevelIdx - 1].targetPeaks else 0
        val heroTarget   = heroNext?.targetPeaks ?: heroCurrent.targetPeaks
        val heroProgress = if (heroTarget > heroPrevTgt)
            ((heroUniquePeaks - heroPrevTgt).coerceAtLeast(0).toFloat() / (heroTarget - heroPrevTgt)).coerceIn(0f, 1f)
        else 1f
        val heroAltForLevelFmt = stringResource(R.string.home_hero_alt_for_level)
        val heroForLevelFmt    = stringResource(R.string.home_hero_for_level)
        val heroProgressStr    = stringResource(R.string.home_level_progress_peaks, heroUniquePeaks, heroTarget)
        val heroAltReqLabel = if (heroNext != null) {
            val alt = heroNext.altReqs.firstOrNull()
            if (alt != null) String.format(heroAltForLevelFmt, alt.threshold, heroNext.name)
            else String.format(heroForLevelFmt, heroNext.name)
        } else null

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
                        text          = buildAnnotatedString {
                            withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = Color.White)) {
                                append(displayName)
                            }
                            withStyle(SpanStyle(fontWeight = FontWeight.Normal, color = Color.White.copy(alpha = 0.55f))) {
                                append("  ·  ${heroCurrent.name}")
                            }
                        },
                        fontSize      = 18.sp,
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
                // Single line: "41 / 50 cimas · Superar los 3000m para Guide"
                val progressLabel = buildString {
                    append(heroProgressStr)
                    if (heroAltReqLabel != null) append("  ·  $heroAltReqLabel")
                }
                Text(
                    text     = progressLabel,
                    fontSize = 12.sp,
                    color    = Color(0xFFCBD5E1),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
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
                                    colors = listOf(Color(0xFF5FA876), Color(0xFF4A8C5C)),
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
            text       = stringResource(R.string.home_onboarding_title),
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

    // Use server-computed levelIdx (1-based) converted to 0-based LEVEL_DEFS index
    val currentLevelIdx = (stats.levelIdx - 1).coerceIn(0, LEVEL_DEFS.lastIndex)

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
    def: LevelDef,
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
                Pill(pluralStringResource(R.plurals.home_level_req_ascents_pill, def.targetPeaks, def.targetPeaks))
                def.altReqs.forEach { r -> Pill(stringResource(R.string.home_level_req_altitude, r.threshold)) }
            }

            // Progress row — in-progress level only
            if (isCurrent) {
                val progress  = (uniquePeaks.toFloat() / def.targetPeaks).coerceIn(0f, 1f)
                val pct       = (progress * 100).toInt()
                val remaining = def.targetPeaks - uniquePeaks

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
                        text       = stringResource(R.string.home_level_progress_peaks, uniquePeaks, def.targetPeaks),
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

// ── Friends ranking (Cordada-style) ───────────────────────────────────────────

@Composable
private fun FriendsRankingSection(entries: List<LeaderboardEntry>) {
    val top3        = entries.take(3)
    val meIdx       = entries.indexOfFirst { it.isCurrentUser }
    val meEntry     = if (meIdx >= 3) entries[meIdx] else null   // null = already in top 3
    val showEllipsis = meEntry != null && meIdx > 3               // gap when me is at position 5+; position 4 gets just a divider

    OutlinedCard(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = MaterialTheme.shapes.large,
    ) {
        Column {
            Text(
                text       = stringResource(R.string.home_section_leaderboard),
                fontSize   = 15.sp,
                fontWeight = FontWeight.Bold,
                color      = FriendsTextPrimary,
                modifier   = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            )
            HorizontalDivider(color = FriendsDivider)

            top3.forEachIndexed { i, entry ->
                FriendRankRow(entry = entry, rank = i + 1)
                // divider after each top-3 row except the last visible one
                val isLastVisible = i == top3.lastIndex && meEntry == null
                if (!isLastVisible) {
                    HorizontalDivider(color = FriendsDivider, modifier = Modifier.padding(start = 76.dp))
                }
            }

            if (showEllipsis) {
                RankingEllipsisRow()
            }

            if (meEntry != null) {
                FriendRankRow(entry = meEntry, rank = meIdx + 1)
            }
        }
    }
}

@Composable
private fun RankingEllipsisRow() {
    Box(
        modifier         = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        Text(
            text     = "· · ·",
            fontSize = 13.sp,
            color    = FriendsTextMuted,
            modifier = Modifier.padding(start = 40.dp),  // aligns under the rank badge
        )
    }
}

@Composable
private fun FriendRankRow(entry: LeaderboardEntry, rank: Int) {
    val valueColor = Color(0xFF374151)
    val sep        = FriendsTextMuted
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (entry.isCurrentUser) Modifier.background(Color(0xFFF0F9FF)) else Modifier)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        FriendRankBadge(rank)
        UserAvatar(entry.name, 52, entry.avatarUrl)
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text     = entry.name,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color    = FriendsTextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
                if (entry.isCurrentUser) {
                    Text("  ${stringResource(R.string.home_leaderboard_you)}", fontSize = 12.sp, color = FriendsTextSecondary)
                }
            }
            Text(
                text       = levelName(entry.levelIdx),
                fontSize   = 12.sp,
                color      = FriendsTextSecondary,
                fontWeight = FontWeight.Medium,
                modifier   = Modifier.padding(top = 1.dp),
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier          = Modifier.padding(top = 1.dp),
            ) {
                Text("${entry.totalAscents}", fontSize = 12.sp, color = valueColor, fontWeight = FontWeight.SemiBold)
                Text(" ${stringResource(R.string.home_leaderboard_col_peaks)}", fontSize = 12.sp, color = FriendsTextSecondary)
                Text("  ·  ", fontSize = 12.sp, color = sep)
                CairnIcon(Modifier.padding(end = 3.dp))
                Text("${entry.cairns}", fontSize = 12.sp, color = Color(0xFFF59E0B), fontWeight = FontWeight.SemiBold)
                Text("  ·  ", fontSize = 12.sp, color = sep)
                Text("${entry.ep}", fontSize = 12.sp, color = valueColor, fontWeight = FontWeight.SemiBold)
                Text(" ${stringResource(R.string.home_leaderboard_col_ep)}", fontSize = 12.sp, color = FriendsTextSecondary)
            }
        }
    }
}

@Composable
private fun FriendRankBadge(rank: Int) {
    val (bg, content) = when (rank) {
        1    -> Color(0xFFFDE68A) to Color(0xFFD97706)
        2    -> Color(0xFFE5E7EB) to Color(0xFF6B7280)
        3    -> Color(0xFFF8D9B8) to Color(0xFFB45309)
        else -> Color.Transparent to Color(0xFF111827)
    }
    Box(
        modifier         = Modifier
            .size(width = 30.dp, height = 44.dp)
            .then(if (rank <= 3) Modifier.clip(RoundedCornerShape(10.dp)).background(bg) else Modifier),
        contentAlignment = Alignment.Center,
    ) {
        Text("$rank", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = content)
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
            text       = levelName(levelIdx),
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
private fun SoloRankingSection(
    meEntry: LeaderboardEntry,
    onInvite: () -> Unit,
) {
    OutlinedCard(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = MaterialTheme.shapes.large,
    ) {
        Column {
            // ── Title (identical to FriendsRankingSection) ────────────────────
            Text(
                text       = stringResource(R.string.home_section_leaderboard),
                fontSize   = 15.sp,
                fontWeight = FontWeight.Bold,
                color      = FriendsTextPrimary,
                modifier   = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            )
            HorizontalDivider(color = FriendsDivider)

            // ── User row at rank 1 (reuses exact FriendRankRow) ──────────────
            FriendRankRow(entry = meEntry, rank = 1)

            HorizontalDivider(color = FriendsDivider, modifier = Modifier.padding(start = 76.dp))

            // ── Ghost avatars + aspirational text ─────────────────────────────
            Column(
                modifier            = Modifier
                    .fillMaxWidth()
                    .padding(start = 16.dp, end = 16.dp, top = 20.dp, bottom = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                // 4 dashed circles with dotted connectors between them
                Row(
                    verticalAlignment      = Alignment.CenterVertically,
                    horizontalArrangement  = Arrangement.Center,
                    modifier               = Modifier.fillMaxWidth(),
                ) {
                    repeat(4) { i ->
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .drawBehind {
                                    val stroke = 1.5.dp.toPx()
                                    val intervals = floatArrayOf(6.dp.toPx(), 4.dp.toPx())
                                    drawCircle(
                                        color       = Color(0xFFD1D5DB),
                                        radius      = size.minDimension / 2f - stroke / 2f,
                                        style       = Stroke(
                                            width       = stroke,
                                            pathEffect  = PathEffect.dashPathEffect(intervals, 0f),
                                        ),
                                    )
                                },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector        = GhostPersonIcon,
                                contentDescription = null,
                                tint               = Color(0xFFD1D5DB),
                                modifier           = Modifier.size(22.dp),
                            )
                        }
                        if (i < 3) {
                            // Dotted connector line
                            Canvas(modifier = Modifier.width(16.dp).height(1.dp)) {
                                val intervals = floatArrayOf(3.dp.toPx(), 3.dp.toPx())
                                drawLine(
                                    color       = Color(0xFFD1D5DB),
                                    start       = Offset(0f, size.height / 2f),
                                    end         = Offset(size.width, size.height / 2f),
                                    strokeWidth = 1.5.dp.toPx(),
                                    pathEffect  = PathEffect.dashPathEffect(intervals, 0f),
                                )
                            }
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))

                Text(
                    text       = stringResource(R.string.home_solo_empty_title),
                    fontSize   = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color      = FriendsTextPrimary,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text       = stringResource(R.string.home_solo_empty_desc),
                    fontSize   = 13.sp,
                    color      = FriendsTextSecondary,
                    lineHeight = 19.sp,
                    textAlign  = androidx.compose.ui.text.style.TextAlign.Center,
                    modifier   = Modifier.padding(horizontal = 8.dp),
                )
                Spacer(Modifier.height(20.dp))
            }

            HorizontalDivider(color = FriendsDivider)

            // ── CTA button ────────────────────────────────────────────────────
            Button(
                onClick  = onInvite,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 14.dp)
                    .height(48.dp),
                shape  = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PeakGreenCTA),
            ) {
                Text(
                    text       = stringResource(R.string.home_solo_invite_btn),
                    fontWeight = FontWeight.Bold,
                    fontSize   = 14.sp,
                )
            }
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

// ── Ghost person icon (inline, no Material dependency) ─────────────────────────

private val GhostPersonIcon: ImageVector get() = ImageVector.Builder(
    name = "GhostPerson", defaultWidth = 24.dp, defaultHeight = 24.dp,
    viewportWidth = 24f, viewportHeight = 24f,
).apply {
    // Head circle
    addPath(
        pathData = PathBuilder().apply {
            moveTo(12f, 4f)
            curveTo(9.79f, 4f, 8f, 5.79f, 8f, 8f)
            curveTo(8f, 10.21f, 9.79f, 12f, 12f, 12f)
            curveTo(14.21f, 12f, 16f, 10.21f, 16f, 8f)
            curveTo(16f, 5.79f, 14.21f, 4f, 12f, 4f)
            close()
        }.nodes,
        fill = androidx.compose.ui.graphics.SolidColor(Color(0xFFD1D5DB)),
    )
    // Body / shoulders
    addPath(
        pathData = PathBuilder().apply {
            moveTo(12f, 14f)
            curveTo(7.58f, 14f, 4f, 16.69f, 4f, 20f)
            lineTo(20f, 20f)
            curveTo(20f, 16.69f, 16.42f, 14f, 12f, 14f)
            close()
        }.nodes,
        fill = androidx.compose.ui.graphics.SolidColor(Color(0xFFD1D5DB)),
    )
}.build()

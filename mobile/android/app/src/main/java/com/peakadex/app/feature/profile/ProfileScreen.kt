package com.peakadex.app.feature.profile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil3.compose.AsyncImage
import com.peakadex.app.core.model.ProfilePeak
import com.peakadex.app.core.model.ProfilePhoto
import com.peakadex.app.core.model.ProfileStats
import com.peakadex.app.core.model.Rarity
import com.peakadex.app.R
import com.peakadex.app.core.model.User
import com.peakadex.app.core.ui.FirstCardOnboardingBanner
import com.peakadex.app.core.ui.SkeletonBlock
import com.peakadex.app.core.ui.UiText
import com.peakadex.app.core.ui.rememberSkeletonBrush
import com.peakadex.app.core.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.util.Locale

// ── Entry point ───────────────────────────────────────────────────────────────

// ── Lightweight profile: avatar + name + bio only (avatar-dropdown entry point) ──

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileSummaryScreen(
    onBack: () -> Unit,
    onNavigateToSettings: () -> Unit,
    vm: ProfileViewModel = viewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        text       = stringResource(R.string.profile_title),
                        fontSize   = 17.sp,
                        fontWeight = FontWeight.SemiBold,
                        color      = PeakNavyDark,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector        = BackIcon,
                            contentDescription = stringResource(R.string.action_back),
                            tint               = PeakNavyDark,
                            modifier           = Modifier.size(22.dp),
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor    = MaterialTheme.colorScheme.surface,
                    titleContentColor = Color.Unspecified,
                ),
                windowInsets = TopAppBarDefaults.windowInsets,
            )
            HorizontalDivider(thickness = 1.dp, color = MaterialTheme.colorScheme.outlineVariant)
        },
        containerColor = PeakBackground,
    ) { innerPadding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(PeakBackground),
        ) {
            when (val s = state) {
                is ProfileUiState.Loading -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = PeakBlueActive)
                    }
                }
                is ProfileUiState.Error -> {
                    Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                        Text(s.message.asString(), color = PeakMuted, fontSize = 14.sp)
                    }
                }
                is ProfileUiState.Success -> {
                    ProfileHeader(user = s.data.user, onEditProfile = onNavigateToSettings)
                }
            }
        }
    }
}

// ── Full profile: header + 3 tabs (Cimas / Fotos / Etiquetado) — Bitácora tab ─

@Composable
fun BitacoraScreen(
    onNavigateToSettings: () -> Unit,
    onNavigateToCards: (peakId: String, peakName: String) -> Unit,
    onAscentClick: (ascentId: String, isOwn: Boolean) -> Unit,
    onCaptureFirstSummit: () -> Unit = {},
    vm: ProfileViewModel = viewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()
    var isRefreshing by remember { mutableStateOf(false) }

    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = {
            isRefreshing = true
            vm.refresh()
            isRefreshing = false
        },
        modifier = Modifier.fillMaxSize().background(PeakBackground),
    ) {
        when (val s = state) {
            is ProfileUiState.Loading -> {
                ProfileLoadingState()
            }
            is ProfileUiState.Error -> {
                Column(
                    Modifier.fillMaxSize().padding(32.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(s.message.asString(), color = PeakMuted, fontSize = 14.sp)
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = { vm.load() }) { Text(stringResource(R.string.action_retry)) }
                }
            }
            is ProfileUiState.Success -> {
                ProfileContent(
                    state                = s,
                    onPeakQuery          = vm::setPeakQuery,
                    onPeakRarityFilter   = vm::setPeakRarityFilter,
                    onNavigateToCards  = onNavigateToCards,
                    onAscentClick        = onAscentClick,
                    onCaptureFirstSummit = onCaptureFirstSummit,
                )
            }
        }
    }
}

// ── Loading ───────────────────────────────────────────────────────────────────

@Composable
private fun ProfileLoadingState() {
    val shimmer = rememberSkeletonBrush("profileSkeleton")

    Column(Modifier.fillMaxSize().background(PeakBackground)) {
        Surface(color = Color.White) {
            Row(
                modifier              = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                repeat(3) {
                    Box(
                        modifier         = Modifier.weight(1f).height(48.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        SkeletonBlock(shimmer, Modifier.fillMaxWidth(0.72f).height(13.dp))
                    }
                }
            }
        }

        LazyColumn(
            contentPadding = PaddingValues(bottom = 24.dp),
            modifier       = Modifier.fillMaxSize().background(PeakBackground),
        ) {
            item { CimasStatsHeaderSkeleton(shimmer) }
            item { SearchFieldSkeleton(shimmer) }
            items(6) {
                PeakRowCardSkeleton(
                    brush    = shimmer,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 5.dp),
                )
            }
        }
    }
}

@Composable
private fun CimasStatsHeaderSkeleton(brush: Brush) {
    Surface(color = Color.White, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(horizontal = 16.dp, vertical = 16.dp)) {
            Row(
                modifier              = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment     = Alignment.Top,
            ) {
                Column {
                    SkeletonBlock(brush, Modifier.width(68.dp).height(9.dp))
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        SkeletonBlock(brush, Modifier.width(44.dp).height(28.dp))
                        SkeletonBlock(brush, Modifier.width(48.dp).height(14.dp))
                        SkeletonBlock(brush, Modifier.width(28.dp).height(14.dp))
                        SkeletonBlock(brush, Modifier.width(72.dp).height(14.dp))
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    SkeletonBlock(brush, Modifier.width(78.dp).height(9.dp))
                    Spacer(Modifier.height(8.dp))
                    SkeletonBlock(brush, Modifier.width(82.dp).height(20.dp))
                }
            }

            Spacer(Modifier.height(14.dp))
            Row(
                modifier              = Modifier.fillMaxWidth().height(8.dp),
                horizontalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                listOf(0.20f, 0.14f, 0.28f, 0.18f, 0.20f).forEach { weight ->
                    SkeletonBlock(
                        brush    = brush,
                        modifier = Modifier.weight(weight).fillMaxHeight(),
                        shape    = RoundedCornerShape(4.dp),
                    )
                }
            }
        }
    }
    HorizontalDivider(thickness = 1.dp, color = MaterialTheme.colorScheme.outlineVariant)
}

@Composable
private fun SearchFieldSkeleton(brush: Brush) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape  = RoundedCornerShape(12.dp),
        color  = Color.White,
        border = BorderStroke(1.dp, PeakBorderLight),
    ) {
        Row(
            modifier          = Modifier.fillMaxWidth().height(56.dp).padding(horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            SkeletonBlock(brush, Modifier.size(18.dp), RoundedCornerShape(9.dp))
            Spacer(Modifier.width(12.dp))
            SkeletonBlock(brush, Modifier.fillMaxWidth(0.48f).height(14.dp))
        }
    }
}

@Composable
private fun PeakRowCardSkeleton(brush: Brush, modifier: Modifier = Modifier) {
    Surface(
        modifier        = modifier,
        shape           = RoundedCornerShape(12.dp),
        color           = Color.White,
        shadowElevation = 2.dp,
        border          = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Row(
            modifier = Modifier.height(84.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            SkeletonBlock(
                brush    = brush,
                modifier = Modifier.width(4.dp).fillMaxHeight(),
                shape    = RoundedCornerShape(0.dp),
            )
            Column(
                modifier            = Modifier.fillMaxWidth().padding(start = 12.dp, end = 14.dp, top = 12.dp, bottom = 16.dp),
                verticalArrangement = Arrangement.spacedBy(9.dp),
            ) {
                SkeletonBlock(brush, Modifier.fillMaxWidth(0.56f).height(15.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    SkeletonBlock(brush, Modifier.width(92.dp).height(26.dp), RoundedCornerShape(100.dp))
                    Spacer(Modifier.weight(1f))
                    SkeletonBlock(brush, Modifier.width(76.dp).height(16.dp))
                    SkeletonBlock(brush, Modifier.width(78.dp).height(14.dp))
                }
            }
        }
    }
}

@Composable
private fun RarityDot(color: Color) {
    Box(
        modifier = Modifier
            .size(9.dp)
            .clip(CircleShape)
            .background(color),
    )
}

@Composable
private fun CompactRarityPill(label: String, color: Color, darkColor: Color) {
    Row(
        modifier = Modifier
            .heightIn(min = 26.dp)
            .clip(RoundedCornerShape(100.dp))
            .background(color.copy(alpha = 0.13f))
            .padding(horizontal = 9.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        RarityDot(color)
        Text(
            text       = label,
            fontSize   = 10.sp,
            lineHeight = 12.sp,
            fontWeight = FontWeight.Bold,
            color      = darkColor,
            maxLines   = 1,
            overflow   = TextOverflow.Ellipsis,
        )
    }
}

// ── Main content (tabs) ───────────────────────────────────────────────────────

@Composable
private fun ProfileContent(
    state: ProfileUiState.Success,
    onPeakQuery: (String) -> Unit,
    onPeakRarityFilter: (String?) -> Unit,
    onNavigateToCards: (peakId: String, peakName: String) -> Unit,
    onAscentClick: (ascentId: String, isOwn: Boolean) -> Unit,
    onCaptureFirstSummit: () -> Unit = {},
) {
    var activeTab by remember { mutableIntStateOf(0) }
    val tabs = listOf(
        stringResource(R.string.profile_tab_peaks),
        stringResource(R.string.profile_tab_photos),
        stringResource(R.string.profile_tab_tagged),
    )

    Column(Modifier.fillMaxSize()) {
        // ── Tabs (SecondaryTabRow = underline indicator, same as web) ──
        SecondaryTabRow(
            selectedTabIndex = activeTab,
            containerColor   = Color.White,
            contentColor     = PeakBlueActive,
        ) {
            tabs.forEachIndexed { i, label ->
                Tab(
                    selected = activeTab == i,
                    onClick  = { activeTab = i },
                    text = {
                        Text(
                            text       = label,
                            fontSize   = 13.sp,
                            fontWeight = if (activeTab == i) FontWeight.SemiBold else FontWeight.Normal,
                        )
                    },
                    selectedContentColor   = PeakBlueActive,
                    unselectedContentColor = PeakMuted,
                )
            }
        }

        // ── Tab content ──
        when (activeTab) {
            0 -> CimasTab(
                peaks                = state.filteredPeaks,
                allPeaks             = state.data.peaks,
                stats                = state.data.stats,
                rarities             = state.data.rarities,
                query                = state.peakQuery,
                rarityFilter         = state.peakRarityFilter,
                onQuery              = onPeakQuery,
                onCaptureFirstSummit = onCaptureFirstSummit,
                onRarityFilter      = onPeakRarityFilter,
                onNavigateToCards = onNavigateToCards,
            )
            1 -> PhotosTab(
                photos        = state.data.photos,
                rarities      = state.data.rarities,
                onAscentClick = { ascentId -> onAscentClick(ascentId, true) },
            )
            2 -> PhotosTab(
                photos        = state.data.taggedPhotos,
                rarities      = state.data.rarities,
                showCreator   = true,
                onAscentClick = { ascentId -> onAscentClick(ascentId, false) },
            )
        }
    }
}

// ── Profile header ────────────────────────────────────────────────────────────

@Composable
private fun ProfileHeader(
    user: User,
    onEditProfile: () -> Unit,
) {
    val initials = remember(user.name) {
        val parts = user.name.trim().split(" ")
        if (parts.size >= 2) "${parts.first().first()}${parts.last().first()}".uppercase()
        else user.name.first().uppercaseChar().toString()
    }

    Surface(color = Color.White, shadowElevation = 0.dp) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 20.dp)) {
            Row(
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // Avatar
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(listOf(PeakBlueActive, PeakBlueLight))
                        )
                        .border(width = 3.dp, color = Color.White, shape = CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    if (user.avatarUrl != null) {
                        AsyncImage(
                            model             = user.avatarUrl,
                            contentDescription = "Avatar",
                            contentScale      = ContentScale.Crop,
                            modifier          = Modifier.fillMaxSize(),
                        )
                    } else {
                        Text(
                            text       = initials,
                            color      = Color.White,
                            fontSize   = 24.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }

                // Name / username / bio
                Column(Modifier.weight(1f)) {
                    Text(
                        text       = user.name,
                        fontSize   = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color      = PeakNavyDark,
                        maxLines   = 1,
                        overflow   = TextOverflow.Ellipsis,
                    )
                    if (user.username != null) {
                        Spacer(Modifier.height(2.dp))
                        Text(
                            text     = "@${user.username}",
                            fontSize = 13.sp,
                            color    = PeakNavyLight,
                        )
                    }
                    if (!user.bio.isNullOrBlank()) {
                        Spacer(Modifier.height(6.dp))
                        Text(
                            text     = user.bio,
                            fontSize = 12.sp,
                            color    = PeakMuted,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                            lineHeight = 17.sp,
                        )
                    }
                }
            }

            Spacer(Modifier.height(14.dp))

            // Edit profile button
            OutlinedButton(
                onClick        = onEditProfile,
                modifier       = Modifier.fillMaxWidth().height(36.dp),
                shape          = RoundedCornerShape(8.dp),
                border         = BorderStroke(1.dp, PeakBorderLight),
                contentPadding = PaddingValues(0.dp),
                colors         = ButtonDefaults.outlinedButtonColors(contentColor = PeakNavyDark),
            ) {
                Icon(
                    imageVector        = EditIcon,
                    contentDescription = null,
                    modifier           = Modifier.size(14.dp),
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    text       = stringResource(R.string.profile_edit_btn),
                    fontSize   = 13.sp,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
    HorizontalDivider(thickness = 1.dp, color = MaterialTheme.colorScheme.outlineVariant)
}

// ── Cimas tab ─────────────────────────────────────────────────────────────────

@Composable
private fun CimasTab(
    peaks: List<ProfilePeak>,
    allPeaks: List<ProfilePeak>,
    stats: ProfileStats,
    rarities: List<Rarity>,
    query: String,
    rarityFilter: String?,
    onQuery: (String) -> Unit,
    onRarityFilter: (String?) -> Unit,
    onNavigateToCards: (peakId: String, peakName: String) -> Unit,
    onCaptureFirstSummit: () -> Unit = {},
) {
    val focusManager = LocalFocusManager.current
    val rarityMap = remember(rarities) { rarities.associateBy { it.id } }
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    LazyColumn(
        state          = listState,
        contentPadding = PaddingValues(bottom = 180.dp),
        modifier       = Modifier.fillMaxSize().background(PeakBackground).imePadding(),
    ) {
        // Stats header
        item(key = "stats_header") {
            CimasStatsHeader(
                allPeaks     = allPeaks,
                stats        = stats,
                rarities     = rarities,
                rarityFilter = rarityFilter,
                onRarityFilter = onRarityFilter,
            )
        }

        // Search field
        item(key = "search") {
            com.peakadex.app.core.ui.PeakSearchField(
                value           = query,
                onValueChange   = onQuery,
                placeholder     = stringResource(R.string.profile_search_placeholder),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(
                    onSearch = {
                        focusManager.clearFocus()
                        if (peaks.isNotEmpty()) {
                            scope.launch { listState.animateScrollToItem(2) }
                        }
                    },
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
            )
        }

        if (peaks.isEmpty()) {
            item(key = "empty") {
                if (query.isNotBlank() || rarityFilter != null) {
                    // Filtered empty state
                    Box(
                        Modifier.fillMaxWidth().padding(48.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text     = stringResource(R.string.profile_empty_filtered),
                            fontSize = 14.sp,
                            color    = PeakSubtle,
                        )
                    }
                } else {
                    // No ascents at all — show onboarding banner
                    FirstCardOnboardingBanner(onCapture = onCaptureFirstSummit)
                }
            }
        } else {
            items(peaks, key = { it.id }) { peak ->
                PeakRowCard(
                    peak      = peak,
                    rarityMap = rarityMap,
                    onClick   = { onNavigateToCards(peak.id, peak.name) },
                    modifier  = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 5.dp),
                )
            }
        }
    }
}

// ── Cimas stats header ────────────────────────────────────────────────────────

@Composable
private fun CimasStatsHeader(
    allPeaks: List<ProfilePeak>,
    stats: ProfileStats,
    rarities: List<Rarity>,
    rarityFilter: String?,
    onRarityFilter: (String?) -> Unit,
) {
    val totalAscents = allPeaks.sumOf { it.count }

    // Rarity bar segments
    val rarityCounts = remember(allPeaks) {
        allPeaks.groupingBy { it.rarityId ?: "daisy" }.eachCount()
    }
    val presentRarities = rarities.filter { (rarityCounts[it.id] ?: 0) > 0 }

    Surface(
        color  = Color.White,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(horizontal = 16.dp, vertical = 16.dp)) {
            // Stats row
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment     = Alignment.Top,
            ) {
                // Left: peaks count + ascents
                Column {
                    Text(
                        text       = stringResource(R.string.profile_stat_peaks),
                        fontSize   = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color      = PeakNavyLight,
                        letterSpacing = 1.5.sp,
                    )
                    Spacer(Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            text       = "${allPeaks.size}",
                            fontSize   = 28.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color      = PeakNavyDark,
                            lineHeight = 28.sp,
                        )
                        Text(
                            text     = stringResource(R.string.profile_peaks_suffix),
                            fontSize = 14.sp,
                            color    = PeakNavyMid,
                        )
                        Text(
                            text       = "$totalAscents",
                            fontSize   = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color      = PeakNavyDark,
                        )
                        Text(
                            text     = stringResource(R.string.profile_ascents_suffix),
                            fontSize = 14.sp,
                            color    = PeakNavyMid,
                        )
                    }
                }

                // Right: max altitude
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text       = stringResource(R.string.profile_stat_max_alt),
                        fontSize   = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color      = PeakNavyLight,
                        letterSpacing = 1.5.sp,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text       = "${stats.maxAltitude} m",
                        fontSize   = 20.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color      = PeakNavyDark,
                        lineHeight = 20.sp,
                    )
                }
            }

            // Rarity distribution bar
            if (presentRarities.isNotEmpty() && allPeaks.isNotEmpty()) {
                Spacer(Modifier.height(14.dp))
                Row(
                    Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    presentRarities.forEach { r ->
                        val count = rarityCounts[r.id] ?: 0
                        val color = runCatching {
                            Color(android.graphics.Color.parseColor(r.color))
                        }.getOrElse { PeakClimbedGreen }
                        val isActive = rarityFilter == null || rarityFilter == r.id
                        Box(
                            Modifier
                                .weight(count.toFloat())
                                .fillMaxHeight()
                                .clip(RoundedCornerShape(4.dp))
                                .background(color.copy(alpha = if (isActive) 1f else 0.35f))
                                .clickable {
                                    onRarityFilter(if (rarityFilter == r.id) null else r.id)
                                },
                        )
                    }
                }
            }
        }
    }
    HorizontalDivider(thickness = 1.dp, color = MaterialTheme.colorScheme.outlineVariant)
}

// ── PeakRowCard ───────────────────────────────────────────────────────────────

@Composable
private fun PeakRowCard(
    peak: ProfilePeak,
    rarityMap: Map<String, Rarity>,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val rarity = rarityMap[peak.rarityId]
    val rarityColor = rarity?.let {
        runCatching { Color(android.graphics.Color.parseColor(it.color)) }.getOrNull()
    } ?: PeakClimbedGreen
    val rarityColorDark = rarity?.let {
        runCatching { Color(android.graphics.Color.parseColor(it.colorDark)) }.getOrNull()
    } ?: PeakBlueDark

    Surface(
        onClick         = onClick,
        modifier        = modifier,
        shape           = RoundedCornerShape(12.dp),
        color           = Color.White,
        shadowElevation = 2.dp,
        border          = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Row(
            modifier = Modifier.height(84.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .width(4.dp)
                    .fillMaxHeight()
                    .background(rarityColor),
            )

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 12.dp, end = 14.dp, top = 12.dp, bottom = 16.dp),
                verticalArrangement = Arrangement.spacedBy(9.dp),
            ) {
                Text(
                    text       = peak.name,
                    fontSize   = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color      = PeakNavyDark,
                    maxLines   = 1,
                    overflow   = TextOverflow.Ellipsis,
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (rarity != null) {
                        CompactRarityPill(
                            label     = rarity.label,
                            color     = rarityColor,
                            darkColor = rarityColorDark,
                        )
                        Spacer(Modifier.width(10.dp))
                    }
                    Text(
                        text       = "${peak.altitudeM} m",
                        fontSize   = 13.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color      = PeakNavyDark,
                        maxLines   = 1,
                    )
                    Spacer(Modifier.weight(1f))
                    Text(
                        text       = formatDate(peak.lastDate),
                        fontSize   = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color      = PeakNavyMid,
                        maxLines   = 1,
                        textAlign  = TextAlign.End,
                        modifier   = Modifier.width(78.dp),
                    )
                }
            }
        }
    }
}

// ── Photos tab ────────────────────────────────────────────────────────────────

@Composable
private fun PhotosTab(
    photos: List<ProfilePhoto>,
    rarities: List<Rarity>,
    showCreator: Boolean = false,
    onAscentClick: (ascentId: String) -> Unit,
) {
    val rarityMap = remember(rarities) { rarities.associateBy { it.id } }

    if (photos.isEmpty()) {
        Box(
            Modifier.fillMaxSize().padding(48.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text     = if (showCreator) stringResource(R.string.profile_empty_tagged)
                           else stringResource(R.string.profile_empty_photos),
                fontSize = 14.sp,
                color    = PeakSubtle,
            )
        }
        return
    }

    LazyVerticalGrid(
        columns            = GridCells.Fixed(3),
        contentPadding     = PaddingValues(4.dp),
        horizontalArrangement = Arrangement.spacedBy(3.dp),
        verticalArrangement   = Arrangement.spacedBy(3.dp),
        modifier           = Modifier.fillMaxSize().background(PeakBackground),
    ) {
        items(photos, key = { it.id }) { photo ->
            PhotoTile(
                photo         = photo,
                rarityMap     = rarityMap,
                showCreator   = showCreator,
                onClick       = { onAscentClick(photo.ascentId) },
            )
        }
    }
}

// ── PhotoTile ─────────────────────────────────────────────────────────────────

@Composable
private fun PhotoTile(
    photo: ProfilePhoto,
    rarityMap: Map<String, Rarity>,
    showCreator: Boolean,
    onClick: () -> Unit,
) {
    val rarity = rarityMap[photo.rarityId]
    val rarityColor = rarity?.let {
        runCatching { Color(android.graphics.Color.parseColor(it.color)) }.getOrNull()
    } ?: PeakClimbedGreen

    Box(
        modifier = Modifier
            .aspectRatio(1f)
            .clip(RoundedCornerShape(4.dp))
            .background(Color(0xFF1E293B))
            .clickable { onClick() },
    ) {
        AsyncImage(
            model             = photo.url,
            contentDescription = photo.peakName,
            contentScale      = ContentScale.Crop,
            modifier          = Modifier.fillMaxSize(),
        )

        // Bottom overlay: creator badge (tagged tab) or nothing
        if (showCreator && !photo.creatorName.isNullOrBlank()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(listOf(Color.Transparent, Color(0xCC0D2538)))
                    )
                    .padding(horizontal = 5.dp, vertical = 4.dp),
            ) {
                Text(
                    text     = "@${photo.creatorName}",
                    fontSize = 9.sp,
                    color    = Color.White.copy(alpha = 0.85f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }

        // Rarity badge — top-left corner (matches web PhotoTile)
        Box(
            modifier = Modifier
                .size(22.dp)
                .align(Alignment.TopStart)
                .offset(x = 5.dp, y = 5.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.95f)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text       = "✿",
                color      = rarityColor,
                fontSize   = 13.sp,
                lineHeight = 13.sp,
            )
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** "YYYY-MM-DD" → locale-aware short date, e.g. "15 ene '24" in es, "15 jan '24" in en */
private fun formatDate(iso: String): String {
    return try {
        val date  = LocalDate.parse(iso.take(10))
        val day   = date.dayOfMonth
        val month = date.month.getDisplayName(java.time.format.TextStyle.SHORT, Locale.getDefault()).lowercase().trimEnd('.')
        val year  = date.year.toString().takeLast(2)
        "$day $month '$year"
    } catch (_: Exception) {
        iso
    }
}

// ── Icons (inline ImageVector) ────────────────────────────────────────────────

private val EditIcon: ImageVector by lazy {
    ImageVector.Builder("Edit", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke         = SolidColor(Color.Black),
            strokeLineWidth = 2f,
            strokeLineCap  = androidx.compose.ui.graphics.StrokeCap.Round,
            strokeLineJoin = androidx.compose.ui.graphics.StrokeJoin.Round,
        ) {
            moveTo(11f, 4f)
            horizontalLineTo(4f)
            curveTo(3.448f, 4f, 3f, 4.448f, 3f, 5f)
            verticalLineTo(20f)
            curveTo(3f, 20.552f, 3.448f, 21f, 4f, 21f)
            horizontalLineTo(19f)
            curveTo(19.552f, 21f, 20f, 20.552f, 20f, 20f)
            verticalLineTo(13f)
        }
        path(
            stroke         = SolidColor(Color.Black),
            strokeLineWidth = 2f,
            strokeLineCap  = androidx.compose.ui.graphics.StrokeCap.Round,
            strokeLineJoin = androidx.compose.ui.graphics.StrokeJoin.Round,
        ) {
            moveTo(18.5f, 2.5f)
            curveTo(18.898f, 2.102f, 19.449f, 1.878f, 20f, 1.878f)
            curveTo(20.551f, 1.878f, 21.102f, 2.102f, 21.5f, 2.5f)
            curveTo(21.898f, 2.898f, 22.122f, 3.449f, 22.122f, 4f)
            curveTo(22.122f, 4.551f, 21.898f, 5.102f, 21.5f, 5.5f)
            lineTo(12f, 15f)
            lineTo(8f, 16f)
            lineTo(9f, 12f)
            close()
        }
    }.build()
}

private val SearchIcon: ImageVector by lazy {
    ImageVector.Builder("Search", 24.dp, 24.dp, 24f, 24f).apply {
        // Handle line: magnifier glass handle (top-right to bottom-right)
        path(
            stroke          = SolidColor(Color.Black),
            strokeLineWidth = 2f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
        ) {
            moveTo(21f, 21f); lineTo(16.65f, 16.65f)
        }
        // Circle: centred at (11, 11), radius 6
        path(
            stroke          = SolidColor(Color.Black),
            strokeLineWidth = 2f,
        ) {
            moveTo(17f, 11f)
            curveTo(17f, 14.314f, 14.314f, 17f, 11f, 17f)
            curveTo(7.686f, 17f, 5f, 14.314f, 5f, 11f)
            curveTo(5f, 7.686f, 7.686f, 5f, 11f, 5f)
            curveTo(14.314f, 5f, 17f, 7.686f, 17f, 11f)
            close()
        }
    }.build()
}

private val CloseIcon: ImageVector by lazy {
    ImageVector.Builder("Close", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke         = SolidColor(Color.Black),
            strokeLineWidth = 2f,
            strokeLineCap  = androidx.compose.ui.graphics.StrokeCap.Round,
        ) {
            moveTo(18f, 6f); lineTo(6f, 18f)
        }
        path(
            stroke         = SolidColor(Color.Black),
            strokeLineWidth = 2f,
            strokeLineCap  = androidx.compose.ui.graphics.StrokeCap.Round,
        ) {
            moveTo(6f, 6f); lineTo(18f, 18f)
        }
    }.build()
}

// Back / chevron-left icon — used as Up navigation in secondary screens
private val BackIcon: ImageVector by lazy {
    ImageVector.Builder("Back", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke          = SolidColor(Color(0xFF1E293B)),
            strokeLineWidth = 2f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
            strokeLineJoin  = androidx.compose.ui.graphics.StrokeJoin.Round,
        ) {
            moveTo(15f, 18f); lineTo(9f, 12f); lineTo(15f, 6f)
        }
    }.build()
}

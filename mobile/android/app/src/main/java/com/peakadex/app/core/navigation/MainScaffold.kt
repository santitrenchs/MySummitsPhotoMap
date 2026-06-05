package com.peakadex.app.core.navigation

import android.app.Activity
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import kotlinx.coroutines.launch
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.peakadex.app.R
import androidx.navigation.NavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.peakadex.app.AppContainer
import com.peakadex.app.core.model.Ascent
import com.peakadex.app.core.model.User
import com.peakadex.app.core.ui.PeakadexLogo
import com.peakadex.app.core.ui.RarityInfo
import com.peakadex.app.core.ui.rarityForAltitude
import com.peakadex.app.core.ui.theme.PeakBackground
import com.peakadex.app.core.ui.theme.PeakBlueActive
import com.peakadex.app.core.ui.theme.PeakBlueLight
import com.peakadex.app.core.ui.theme.PeakGreenCTA
import com.peakadex.app.feature.atlas.AtlasScreen
import com.peakadex.app.feature.home.HomeScreen
import com.peakadex.app.feature.logbook.LogbookScreen
import com.peakadex.app.feature.newascent.AscentCaptureReveal
import com.peakadex.app.feature.newascent.NewAscentSheet
import com.peakadex.app.feature.friends.FriendsScreen
import com.peakadex.app.feature.friends.UserAvatar
import com.peakadex.app.feature.profile.ProfileScreen

// ── Tab definitions ────────────────────────────────────────────────────────────

data class TabItem(val screen: Screen, val label: String, val iconRes: Int)

private data class CaptureRevealState(
    val ascent:         Ascent,
    val rarity:         RarityInfo,
    val isMythic:       Boolean,
    val taggingWarning: String?,
)

@Composable
private fun tabItems() = listOf(
    TabItem(Screen.Home,    stringResource(R.string.nav_tab_home),    R.drawable.ic_tab_home),
    TabItem(Screen.Friends, stringResource(R.string.nav_tab_cordada), R.drawable.ic_tab_friends),
    TabItem(Screen.Logbook, stringResource(R.string.nav_tab_logbook), R.drawable.ic_tab_logbook),
    TabItem(Screen.Map,     stringResource(R.string.nav_tab_map),     R.drawable.ic_tab_map),
    TabItem(Screen.Cards,   stringResource(R.string.nav_tab_cards),   R.drawable.ic_tab_cards),
)

// ── Main scaffold ──────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScaffold(navController: NavController) {
    val tabNavController = rememberNavController()
    val backStackEntry by tabNavController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val user    by AppContainer.authSession.currentUser.collectAsStateWithLifecycle()
    val context = LocalContext.current

    // Fetch current user on app restore — also when avatarUrl is null (not yet persisted)
    LaunchedEffect(Unit) {
        if (AppContainer.authSession.isAuthenticated && (user == null || user?.avatarUrl == null)) {
            runCatching { AppContainer.apiService.getMe() }
                .onSuccess { AppContainer.authSession.updateUser(it) }
        }
    }

    val snackbarHostState = remember { SnackbarHostState() }
    val scope             = rememberCoroutineScope()

    // Pending peak filter — Atlas → Cards
    var pendingPeakId   by remember { mutableStateOf<String?>(null) }
    var pendingPeakName by remember { mutableStateOf<String?>(null) }

    // Pending rarity filter — Home charts → Cards
    var pendingRarityId by remember { mutableStateOf<String?>(null) }

    // New ascent sheet — peak pre-fill from Atlas "Capturar" button
    var showNewAscent         by remember { mutableStateOf(false) }
    var newAscentPeakId       by remember { mutableStateOf<String?>(null) }
    var newAscentPeakName     by remember { mutableStateOf<String?>(null) }
    var logbookRefreshTrigger  by remember { mutableIntStateOf(0) }
    var logbookHighlightId     by remember { mutableStateOf<String?>(null) }
    var atlasRefreshTrigger    by remember { mutableIntStateOf(0) }
    var captureReveal          by remember { mutableStateOf<CaptureRevealState?>(null) }

    // Friends badge — count of pending incoming requests
    var pendingFriendsCount  by remember { mutableIntStateOf(0) }
    var friendsRefreshTrigger by remember { mutableIntStateOf(0) }
    // Cordada badge — count of pending cordada invites (shown on the Cordada tab)
    var pendingCordadaCount  by remember { mutableIntStateOf(0) }

    // Refresh badge counts on every tab change (and after creating an ascent) so
    // the user sees pending friend/cordada requests without opening the screen.
    LaunchedEffect(friendsRefreshTrigger, currentRoute) {
        try {
            pendingFriendsCount = AppContainer.apiService.getFriendsData().incoming.size
        } catch (_: Exception) {}
        try {
            pendingCordadaCount = AppContainer.apiService.getCordadas().pendingInvites.size
        } catch (_: Exception) {}
    }

    // B — Back gesture on root tab minimises the app instead of popping the back stack
    BackHandler(enabled = currentRoute == Screen.Home.route) {
        (context as? Activity)?.moveTaskToBack(true)
    }

    BackHandler(enabled = captureReveal != null) {}

    // ── Bottom bar hide-on-scroll ──────────────────────────────────────────────
    // available.y < 0 → scrolling down (reading more) → hide bar
    // available.y > 0 → scrolling up (back to top)    → show bar
    // Atlas (MapLibre AndroidView) does not dispatch Compose nestedScroll events,
    // so the bar never hides on that screen even though the connection is attached.
    var isBottomBarVisible by remember { mutableStateOf(true) }

    val hideOnScrollConnection = remember {
        object : NestedScrollConnection {
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                when {
                    available.y < -3f -> isBottomBarVisible = false
                    available.y >  3f -> isBottomBarVisible = true
                }
                return Offset.Zero   // observe only — don't consume
            }
        }
    }

    // Always show the bar when switching tabs
    LaunchedEffect(currentRoute) {
        isBottomBarVisible = true
    }

    // Outer Box so captureReveal can overlay the full screen (including top/bottom bars)
    Box(modifier = Modifier.fillMaxSize()) {

    Scaffold(
        modifier = Modifier.nestedScroll(hideOnScrollConnection),
        // ① CenterAlignedTopAppBar — M3 standard, replaces custom Surface/Box header
        topBar = {
            MainTopBar(
                user                  = user,
                pendingFriendsCount   = pendingFriendsCount,
                onNavigateToProfile   = { navController.navigate(Screen.Profile.route) },
                onNavigateToSettings  = { navController.navigate(Screen.Settings.route) },
                onNavigateToFriends   = { navController.navigate(Screen.Friends.route) },
            )
        },
        // ② FAB — M3 canonical position for primary action (bottom-end, above nav bar).
        // Only on Logbook (Bitácora) + Cards, where the primary action is "create ascent".
        // Stats is a dashboard (no create action); Atlas creates from the peak detail sheet;
        // Friends renders its own green speed-dial FAB. Color = PeakGreenCTA (DESIGN.md: CTA = green).
        floatingActionButton = {
            if (currentRoute == Screen.Logbook.route || currentRoute == Screen.Cards.route) {
                FloatingActionButton(
                    onClick = { newAscentPeakId = null; newAscentPeakName = null; showNewAscent = true },
                    containerColor = PeakGreenCTA,
                    contentColor = Color.White,
                    shape = CircleShape,
                    elevation = FloatingActionButtonDefaults.elevation(
                        defaultElevation = 4.dp,
                        pressedElevation = 8.dp,
                    ),
                ) {
                    Icon(
                        imageVector        = PlusIcon,
                        contentDescription = stringResource(R.string.nav_fab_new_ascent),
                        modifier           = Modifier.size(24.dp),
                    )
                }
            }
        },
        bottomBar = {
            AnimatedVisibility(
                visible = isBottomBarVisible,
                enter   = slideInVertically(animationSpec = tween(220), initialOffsetY = { it }),
                exit    = slideOutVertically(animationSpec = tween(220), targetOffsetY = { it }),
            ) {
                MainTabBar(
                    currentRoute = currentRoute,
                    cordadaBadge = pendingCordadaCount,
                    onTabSelected = { screen ->
                        tabNavController.navigate(screen.route) {
                            popUpTo(Screen.Home.route) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                )
            }
        },
        containerColor = PeakBackground,
        snackbarHost   = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->

    // New ascent bottom sheet (rendered outside Scaffold so it overlays the FAB/nav bar)
    if (showNewAscent) {
        NewAscentSheet(
            onDismiss       = { showNewAscent = false },
            onSuccess       = { ascent, taggingWarning ->
                showNewAscent      = false
                logbookHighlightId = ascent.id
                logbookRefreshTrigger++
                atlasRefreshTrigger++
                captureReveal = CaptureRevealState(
                    ascent         = ascent,
                    rarity         = rarityForAltitude(ascent.peak.altitudeM),
                    isMythic       = ascent.peak.isMythic == true,
                    taggingWarning = taggingWarning,
                )
            },
            initialPeakId   = newAscentPeakId,
            initialPeakName = newAscentPeakName,
        )
    }
        NavHost(
            navController = tabNavController,
            startDestination = Screen.Home.route,
            // Use padding(innerPadding) so content respects TopAppBar + NavigationBar insets
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(Screen.Home.route) {
                HomeScreen(
                    onNavigateToCardsWithRarity = { rarityId ->
                        pendingRarityId = rarityId
                        tabNavController.navigate(Screen.Cards.route) {
                            popUpTo(Screen.Home.route) { saveState = true }
                            launchSingleTop = true
                            restoreState    = false  // force fresh so LaunchedEffect fires
                        }
                    },
                )
            }
            composable(Screen.Map.route) {
                AtlasScreen(
                    atlasRefreshTrigger = atlasRefreshTrigger,
                    onNavigateToLogbook = { peakId, peakName ->
                        pendingPeakId   = peakId
                        pendingPeakName = peakName
                        tabNavController.navigate(Screen.Cards.route) {
                            popUpTo(Screen.Home.route) { saveState = true }
                            launchSingleTop = true
                            restoreState    = false  // force fresh — we need LaunchedEffect to fire
                        }
                    },
                    onNavigateToNewAscent = { peakId, peakName ->
                        newAscentPeakId   = peakId
                        newAscentPeakName = peakName
                        showNewAscent     = true
                    },
                )
            }
            composable(Screen.Logbook.route) {
                ProfileScreen(
                    onNavigateToSettings = { navController.navigate(Screen.Settings.route) },
                    onNavigateToLogbook  = { peakId, peakName ->
                        pendingPeakId   = peakId
                        pendingPeakName = peakName
                        tabNavController.navigate(Screen.Cards.route) {
                            popUpTo(Screen.Home.route) { saveState = true }
                            launchSingleTop = true
                            restoreState    = false
                        }
                    },
                    onAscentClick = { ascentId, isOwn ->
                        logbookHighlightId = ascentId
                        // Own photos: switch to Mine filter + refresh so LogbookScreen
                        // scrolls to and highlights the card automatically.
                        // Tagged photos: keep existing Friends filter; the ring will
                        // appear if the card is already visible in the list.
                        if (isOwn) logbookRefreshTrigger++
                        tabNavController.navigate(Screen.Cards.route) {
                            popUpTo(Screen.Home.route) { saveState = true }
                            launchSingleTop = true
                            restoreState    = false
                        }
                    },
                )
            }
            composable(Screen.Friends.route) {
                FriendsScreen(
                    onOpenCordada = { id ->
                        navController.navigate(Screen.CordadaDetail.createRoute(id))
                    },
                )
            }
            composable(Screen.Cards.route) {
                LogbookScreen(
                    onAscentClick       = { ascentId ->
                        navController.navigate(Screen.AscentDetail.createRoute(ascentId))
                    },
                    initialPeakId       = pendingPeakId,
                    initialPeakName     = pendingPeakName,
                    onPeakIdConsumed    = { pendingPeakId = null; pendingPeakName = null },
                    initialRarityId     = pendingRarityId,
                    onRarityIdConsumed  = { pendingRarityId = null },
                    refreshTrigger      = logbookRefreshTrigger,
                    highlightId         = logbookHighlightId,
                    onHighlightConsumed = { logbookHighlightId = null },
                )
            }
        }

    } // end Scaffold

    // Capture reveal overlays the FULL screen (above top bar, FAB and bottom nav)
    captureReveal?.let { reveal ->
        AscentCaptureReveal(
            ascent   = reveal.ascent,
            rarity   = reveal.rarity,
            isMythic = reveal.isMythic,
            onFinished = {
                captureReveal = null
                tabNavController.navigate(Screen.Cards.route) {
                    popUpTo(Screen.Home.route) { saveState = true }
                    launchSingleTop = true
                    restoreState    = false
                }
                if (reveal.taggingWarning != null) {
                    scope.launch { snackbarHostState.showSnackbar(reveal.taggingWarning) }
                }
            },
        )
    }

    } // end outer Box
}

// ── Top bar (M3 CenterAlignedTopAppBar) ────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainTopBar(
    user: User?,
    pendingFriendsCount: Int = 0,
    onNavigateToProfile: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToFriends: () -> Unit = {},
) {
    var sheetOpen by remember { mutableStateOf(false) }

    CenterAlignedTopAppBar(
        title = { PeakadexLogo(height = 32.dp) },
        actions = {
            IconButton(
                onClick  = { sheetOpen = true },
                modifier = Modifier.padding(end = 4.dp),
            ) {
                Box(modifier = Modifier.size(34.dp)) {
                    UserAvatar(
                        name      = user?.name ?: "U",
                        size      = 34,
                        avatarUrl = user?.avatarUrl,
                    )
                    if (pendingFriendsCount > 0) {
                        Box(
                            modifier = Modifier
                                .size(16.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFEF4444))
                                .align(Alignment.TopEnd),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text       = if (pendingFriendsCount > 9) "9+" else pendingFriendsCount.toString(),
                                color      = Color.White,
                                fontSize   = 8.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor    = MaterialTheme.colorScheme.surface,
            titleContentColor = Color.Unspecified,
        ),
        windowInsets = TopAppBarDefaults.windowInsets,
    )
    HorizontalDivider(thickness = 1.dp, color = MaterialTheme.colorScheme.outlineVariant)

    if (sheetOpen) {
        ProfileMenuSheet(
            user               = user,
            onDismiss          = { sheetOpen = false },
            onNavigateToProfile = { sheetOpen = false; onNavigateToProfile() },
            onNavigateToSettings = { sheetOpen = false; onNavigateToSettings() },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProfileMenuSheet(
    user: User?,
    onDismiss: () -> Unit,
    onNavigateToProfile: () -> Unit,
    onNavigateToSettings: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState       = sheetState,
        containerColor   = Color.White,
        dragHandle       = null,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(bottom = 12.dp),
        ) {
            // ── User header ──────────────────────────────────────────────────
            Row(
                modifier            = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 20.dp),
                verticalAlignment   = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                UserAvatar(
                    name      = user?.name ?: "",
                    size      = 52,
                    avatarUrl = user?.avatarUrl,
                )
                Column {
                    Text(
                        text       = user?.name ?: "",
                        fontSize   = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color      = Color(0xFF111827),
                    )
                    if (!user?.email.isNullOrBlank()) {
                        Text(
                            text     = user!!.email,
                            fontSize = 13.sp,
                            color    = Color(0xFF6B7280),
                        )
                    }
                }
            }

            HorizontalDivider(color = Color(0xFFF3F4F6))

            // ── Menu items ───────────────────────────────────────────────────
            ProfileMenuItem(
                icon    = PersonIcon,
                label   = "Perfil",
                onClick = onNavigateToProfile,
            )
            ProfileMenuItem(
                icon    = SettingsIcon,
                label   = "Ajustes",
                onClick = onNavigateToSettings,
            )
        }
    }
}

@Composable
private fun ProfileMenuItem(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    tint: Color = Color(0xFF374151),
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Icon(
            imageVector        = icon,
            contentDescription = label,
            tint               = tint,
            modifier           = Modifier.size(22.dp),
        )
        Text(
            text       = label,
            fontSize   = 15.sp,
            fontWeight = FontWeight.Medium,
            color      = tint,
        )
    }
}

// ── Bottom tab bar (M3 NavigationBar) ─────────────────────────────────────────

@Composable
private fun MainTabBar(
    currentRoute: String?,
    cordadaBadge: Int = 0,
    onTabSelected: (Screen) -> Unit,
) {
    val tabs = tabItems()
    Column {
        HorizontalDivider(thickness = 1.dp, color = MaterialTheme.colorScheme.outlineVariant)
        NavigationBar(
            // ③ M3 indicator restored — use the brand's light blue instead of the
            // theme's primaryContainer (which is green) to stay coherent with our palette
            containerColor = MaterialTheme.colorScheme.surface,
            tonalElevation = 0.dp,
        ) {
            tabs.forEach { tab ->
                val selected = currentRoute == tab.screen.route
                NavigationBarItem(
                    selected = selected,
                    onClick = { onTabSelected(tab.screen) },
                    icon = {
                        val showBadge = tab.screen == Screen.Friends && cordadaBadge > 0
                        BadgedBox(
                            badge = {
                                if (showBadge) {
                                    Badge(containerColor = Color(0xFFEF4444), contentColor = Color.White) {
                                        Text(if (cordadaBadge > 9) "9+" else cordadaBadge.toString())
                                    }
                                }
                            },
                        ) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.size(40.dp)) {
                                if (selected) {
                                    Box(
                                        modifier = Modifier
                                            .size(38.dp)
                                            .background(
                                                brush = Brush.radialGradient(
                                                    colors = listOf(
                                                        PeakBlueActive.copy(alpha = 0.13f),
                                                        Color.Transparent,
                                                    ),
                                                ),
                                                shape = CircleShape,
                                            ),
                                    )
                                }
                                Icon(
                                    painter = painterResource(tab.iconRes),
                                    contentDescription = tab.label,
                                    tint = Color.Unspecified,
                                    modifier = Modifier
                                        .size(24.dp)
                                        .alpha(if (selected) 1f else 0.40f),
                                )
                            }
                        }
                    },
                    label = {
                        Text(
                            text = tab.label,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                        )
                    },
                    colors = NavigationBarItemDefaults.colors(
                        indicatorColor        = Color.Transparent,
                        selectedTextColor     = PeakBlueActive,
                        unselectedTextColor   = MaterialTheme.colorScheme.onSurfaceVariant,
                        selectedIconColor     = Color.Unspecified,
                        unselectedIconColor   = Color.Unspecified,
                    ),
                )
            }
        }
    }
}

// ── Icons ──────────────────────────────────────────────────────────────────────

// Person / Profile icon (outline head + shoulders)
private val PersonIcon: ImageVector by lazy {
    ImageVector.Builder("Person", 24.dp, 24.dp, 24f, 24f).apply {
        // Head circle — centered at (12,8) r=4
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF374151)),
            strokeLineWidth = 1.8f,
        ) {
            moveTo(16f, 8f)
            curveTo(16f, 10.209f, 14.209f, 12f, 12f, 12f)
            curveTo(9.791f, 12f, 8f, 10.209f, 8f, 8f)
            curveTo(8f, 5.791f, 9.791f, 4f, 12f, 4f)
            curveTo(14.209f, 4f, 16f, 5.791f, 16f, 8f)
            close()
        }
        // Shoulders arc — centered, spans x=5..19
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF374151)),
            strokeLineWidth = 1.8f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
        ) {
            moveTo(5f, 20f)
            curveTo(5f, 17.239f, 7.239f, 15f, 10f, 15f)
            horizontalLineTo(14f)
            curveTo(16.761f, 15f, 19f, 17.239f, 19f, 20f)
        }
    }.build()
}

// Gear / Settings icon
private val SettingsIcon: ImageVector by lazy {
    ImageVector.Builder("Settings", 24.dp, 24.dp, 24f, 24f).apply {
        // Outer gear ring — centered at (12,12) r=3
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF374151)),
            strokeLineWidth = 1.8f,
        ) {
            moveTo(15f, 12f)
            curveTo(15f, 13.657f, 13.657f, 15f, 12f, 15f)
            curveTo(10.343f, 15f, 9f, 13.657f, 9f, 12f)
            curveTo(9f, 10.343f, 10.343f, 9f, 12f, 9f)
            curveTo(13.657f, 9f, 15f, 10.343f, 15f, 12f)
            close()
        }
        // Knob line stubs (simplified cog) — centered at (12,12)
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF374151)),
            strokeLineWidth = 1.8f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
        ) {
            moveTo(12f, 6f); lineTo(12f, 7.5f)
            moveTo(12f, 16.5f); lineTo(12f, 18f)
            moveTo(6f, 12f); lineTo(7.5f, 12f)
            moveTo(16.5f, 12f); lineTo(18f, 12f)
            moveTo(7.393f, 7.393f); lineTo(8.454f, 8.454f)
            moveTo(15.546f, 15.546f); lineTo(16.607f, 16.607f)
            moveTo(16.607f, 7.393f); lineTo(15.546f, 8.454f)
            moveTo(8.454f, 15.546f); lineTo(7.393f, 16.607f)
        }
    }.build()
}

// Two-people / Friends icon
private val FriendsIcon: ImageVector by lazy {
    ImageVector.Builder("Friends", 24.dp, 24.dp, 24f, 24f).apply {
        // Front person head
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF374151)),
            strokeLineWidth = 1.8f,
        ) {
            moveTo(9f, 11f)
            curveTo(9f, 12.657f, 7.657f, 14f, 6f, 14f)
            curveTo(4.343f, 14f, 3f, 12.657f, 3f, 11f)
            curveTo(3f, 9.343f, 4.343f, 8f, 6f, 8f)
            curveTo(7.657f, 8f, 9f, 9.343f, 9f, 11f)
            close()
        }
        // Front person shoulders
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF374151)),
            strokeLineWidth = 1.8f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
        ) {
            moveTo(1f, 19f)
            curveTo(1f, 16.791f, 2.791f, 15f, 5f, 15f)
            horizontalLineTo(7f)
            curveTo(9.209f, 15f, 11f, 16.791f, 11f, 19f)
        }
        // Back person head
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF374151)),
            strokeLineWidth = 1.8f,
        ) {
            moveTo(20f, 11f)
            curveTo(20f, 12.657f, 18.657f, 14f, 17f, 14f)
            curveTo(15.343f, 14f, 14f, 12.657f, 14f, 11f)
            curveTo(14f, 9.343f, 15.343f, 8f, 17f, 8f)
            curveTo(18.657f, 8f, 20f, 9.343f, 20f, 11f)
            close()
        }
        // Back person shoulders
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF374151)),
            strokeLineWidth = 1.8f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
        ) {
            moveTo(13f, 19f)
            curveTo(13f, 16.791f, 14.791f, 15f, 17f, 15f)
            horizontalLineTo(19f)
            curveTo(21.209f, 15f, 23f, 16.791f, 23f, 19f)
        }
    }.build()
}

private val PlusIcon: ImageVector by lazy {
    ImageVector.Builder("Plus", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke = androidx.compose.ui.graphics.SolidColor(Color.White),
            strokeLineWidth = 2.5f,
            strokeLineCap = androidx.compose.ui.graphics.StrokeCap.Round,
        ) { moveTo(12f, 5f); lineTo(12f, 19f) }
        path(
            stroke = androidx.compose.ui.graphics.SolidColor(Color.White),
            strokeLineWidth = 2.5f,
            strokeLineCap = androidx.compose.ui.graphics.StrokeCap.Round,
        ) { moveTo(5f, 12f); lineTo(19f, 12f) }
    }.build()
}

package com.peakadex.app.core.navigation

import android.app.Activity
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
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
import com.peakadex.app.core.model.User
import com.peakadex.app.core.ui.PeakadexLogo
import com.peakadex.app.core.ui.theme.PeakBackground
import com.peakadex.app.core.ui.theme.PeakBlueActive
import com.peakadex.app.core.ui.theme.PeakBlueLight
import com.peakadex.app.feature.atlas.AtlasScreen
import com.peakadex.app.feature.home.HomeScreen
import com.peakadex.app.feature.logbook.LogbookScreen
import com.peakadex.app.feature.newascent.NewAscentSheet
import com.peakadex.app.feature.friends.FriendsScreen
import com.peakadex.app.feature.profile.ProfileScreen

// ── Tab definitions ────────────────────────────────────────────────────────────

data class TabItem(val screen: Screen, val label: String, val iconRes: Int)

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

    // Friends badge — count of pending incoming requests
    var pendingFriendsCount  by remember { mutableIntStateOf(0) }
    var friendsRefreshTrigger by remember { mutableIntStateOf(0) }

    LaunchedEffect(friendsRefreshTrigger) {
        try {
            val data = AppContainer.apiService.getFriendsData()
            pendingFriendsCount = data.incoming.size
        } catch (_: Exception) {}
    }

    // B — Back gesture on root tab minimises the app instead of popping the back stack
    BackHandler(enabled = currentRoute == Screen.Home.route) {
        (context as? Activity)?.moveTaskToBack(true)
    }

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
        // Hidden on the Friends/Cordada tab, which renders its own speed-dial FAB.
        floatingActionButton = {
            if (currentRoute != Screen.Friends.route) {
                FloatingActionButton(
                    onClick = { newAscentPeakId = null; newAscentPeakName = null; showNewAscent = true },
                    containerColor = MaterialTheme.colorScheme.primary,
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
            onSuccess       = { ascentId, taggingWarning ->
                showNewAscent      = false
                logbookHighlightId = ascentId
                logbookRefreshTrigger++
                atlasRefreshTrigger++
                tabNavController.navigate(Screen.Cards.route) {
                    popUpTo(Screen.Home.route) { saveState = true }
                    launchSingleTop = true
                    restoreState    = false   // force fresh so LaunchedEffect fires
                }
                if (taggingWarning != null) {
                    scope.launch { snackbarHostState.showSnackbar(taggingWarning) }
                }
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
    }
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
    val initials = user?.name?.let { name ->
        val parts = name.trim().split(" ")
        if (parts.size >= 2) "${parts.first().first()}${parts.last().first()}".uppercase()
        else name.first().uppercaseChar().toString()
    } ?: "U"

    // Dropdown menu state — managed here, anchored to the avatar Box
    var menuExpanded by remember { mutableStateOf(false) }

    CenterAlignedTopAppBar(
        title = { PeakadexLogo(height = 32.dp) },
        actions = {
            // Anchor Box: avatar button + DropdownMenu hang off the same Box
            Box(contentAlignment = Alignment.TopEnd) {
                // Avatar circle — IconButton provides the 48dp M3 touch target
                IconButton(
                    onClick  = { menuExpanded = true },
                    modifier = Modifier.padding(end = 4.dp),
                ) {
                    Box(modifier = Modifier.size(34.dp)) {
                        // Avatar circle
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(CircleShape)
                                .background(Brush.linearGradient(listOf(PeakBlueActive, PeakBlueLight))),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text       = initials,
                                color      = Color.White,
                                fontSize   = 13.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                        // Pending friends badge
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

                // M3 DropdownMenu — anchored to the parent Box, appears below the avatar
                DropdownMenu(
                    expanded         = menuExpanded,
                    onDismissRequest = { menuExpanded = false },
                ) {
                    DropdownMenuItem(
                        text              = { Text("Perfil", fontSize = 14.sp) },
                        leadingIcon       = {
                            Icon(
                                PersonIcon,
                                contentDescription = "Perfil",
                                modifier = Modifier.size(18.dp),
                            )
                        },
                        onClick           = { menuExpanded = false; onNavigateToProfile() },
                    )
                    DropdownMenuItem(
                        text              = { Text("Ajustes", fontSize = 14.sp) },
                        leadingIcon       = {
                            Icon(
                                SettingsIcon,
                                contentDescription = "Ajustes",
                                modifier = Modifier.size(18.dp),
                            )
                        },
                        onClick           = { menuExpanded = false; onNavigateToSettings() },
                    )
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
}

// ── Bottom tab bar (M3 NavigationBar) ─────────────────────────────────────────

@Composable
private fun MainTabBar(
    currentRoute: String?,
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
        // Head circle
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF374151)),
            strokeLineWidth = 1.8f,
        ) {
            moveTo(12f, 12f)
            curveTo(12f, 14.209f, 10.209f, 16f, 8f, 16f)
            curveTo(5.791f, 16f, 4f, 14.209f, 4f, 12f)
            curveTo(4f, 9.791f, 5.791f, 8f, 8f, 8f)
            curveTo(10.209f, 8f, 12f, 9.791f, 12f, 12f)
            close()
        }
        // Shoulders arc
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF374151)),
            strokeLineWidth = 1.8f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
        ) {
            moveTo(1f, 20f)
            curveTo(1f, 17.239f, 3.239f, 15f, 6f, 15f)
            horizontalLineTo(10f)
            curveTo(12.761f, 15f, 15f, 17.239f, 15f, 20f)
        }
    }.build()
}

// Gear / Settings icon
private val SettingsIcon: ImageVector by lazy {
    ImageVector.Builder("Settings", 24.dp, 24.dp, 24f, 24f).apply {
        // Outer gear ring
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF374151)),
            strokeLineWidth = 1.8f,
        ) {
            moveTo(12f, 15f)
            curveTo(12f, 13.343f, 13.343f, 12f, 15f, 12f)
            curveTo(16.657f, 12f, 18f, 13.343f, 18f, 15f)
            curveTo(18f, 16.657f, 16.657f, 18f, 15f, 18f)
            curveTo(13.343f, 18f, 12f, 16.657f, 12f, 15f)
            close()
        }
        // Knob line stubs (simplified cog)
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF374151)),
            strokeLineWidth = 1.8f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
        ) {
            moveTo(15f, 9f); lineTo(15f, 10.5f)
            moveTo(15f, 19.5f); lineTo(15f, 21f)
            moveTo(9f, 15f); lineTo(10.5f, 15f)
            moveTo(19.5f, 15f); lineTo(21f, 15f)
            moveTo(10.393f, 10.393f); lineTo(11.454f, 11.454f)
            moveTo(18.546f, 18.546f); lineTo(19.607f, 19.607f)
            moveTo(19.607f, 10.393f); lineTo(18.546f, 11.454f)
            moveTo(11.454f, 18.546f); lineTo(10.393f, 19.607f)
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

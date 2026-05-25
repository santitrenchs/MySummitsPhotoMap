package com.peakadex.app.core.navigation

import android.app.Activity
import androidx.activity.compose.BackHandler
import kotlinx.coroutines.launch
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
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
import com.peakadex.app.core.ui.PlaceholderScreen
import com.peakadex.app.core.ui.theme.PeakBackground
import com.peakadex.app.core.ui.theme.PeakBlueActive
import com.peakadex.app.core.ui.theme.PeakBlueContainer
import com.peakadex.app.core.ui.theme.PeakBlueLight
import com.peakadex.app.feature.atlas.AtlasScreen
import com.peakadex.app.feature.home.HomeScreen
import com.peakadex.app.feature.logbook.LogbookScreen
import com.peakadex.app.feature.newascent.NewAscentSheet
import com.peakadex.app.feature.settings.ProfileMenuSheet

// ── Tab definitions ────────────────────────────────────────────────────────────

data class TabItem(val screen: Screen, val label: String, val iconRes: Int)

@Composable
private fun tabItems() = listOf(
    TabItem(Screen.Home,    stringResource(R.string.nav_tab_home),    R.drawable.ic_tab_home),
    TabItem(Screen.Map,     stringResource(R.string.nav_tab_map),     R.drawable.ic_tab_map),
    TabItem(Screen.Logbook, stringResource(R.string.nav_tab_logbook), R.drawable.ic_tab_logbook),
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

    // Pending peak filter — Atlas → Logbook
    var pendingPeakId   by remember { mutableStateOf<String?>(null) }
    var pendingPeakName by remember { mutableStateOf<String?>(null) }

    // New ascent sheet — peak pre-fill from Atlas "Capturar" button
    var showNewAscent         by remember { mutableStateOf(false) }
    var newAscentPeakId       by remember { mutableStateOf<String?>(null) }
    var newAscentPeakName     by remember { mutableStateOf<String?>(null) }
    var logbookRefreshTrigger  by remember { mutableIntStateOf(0) }
    var logbookHighlightId     by remember { mutableStateOf<String?>(null) }

    // Profile / settings menu sheet
    var showProfileMenu by remember { mutableStateOf(false) }

    // B — Back gesture on root tab minimises the app instead of popping the back stack
    BackHandler(enabled = currentRoute == Screen.Home.route) {
        (context as? Activity)?.moveTaskToBack(true)
    }

    if (showProfileMenu) {
        ProfileMenuSheet(
            user                 = user,
            onDismiss            = { showProfileMenu = false },
            onNavigateToSettings = {
                showProfileMenu = false
                navController.navigate(Screen.Settings.route)
            },
            onLogout = {
                showProfileMenu = false
                AppContainer.authSession.logout()
                navController.navigate(Screen.Login.route) {
                    popUpTo(0) { inclusive = true }
                }
            },
        )
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        // ① CenterAlignedTopAppBar — M3 standard, replaces custom Surface/Box header
        topBar = {
            MainTopBar(
                user = user,
                onAvatarClick = { showProfileMenu = true },
            )
        },
        // ② FAB — M3 canonical position for primary action (bottom-end, above nav bar)
        floatingActionButton = {
            FloatingActionButton(
                onClick = { newAscentPeakId = null; newAscentPeakName = null; showNewAscent = true },
                containerColor = PeakBlueActive,
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
        },
        bottomBar = {
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
        },
        containerColor = PeakBackground,
    ) { innerPadding ->

    // New ascent bottom sheet (rendered outside Scaffold so it overlays the FAB/nav bar)
    if (showNewAscent) {
        NewAscentSheet(
            onDismiss       = { showNewAscent = false },
            onSuccess       = { ascentId, taggingWarning ->
                showNewAscent      = false
                logbookHighlightId = ascentId
                logbookRefreshTrigger++
                tabNavController.navigate(Screen.Logbook.route) {
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
            composable(Screen.Home.route)    { HomeScreen() }
            composable(Screen.Map.route) {
                AtlasScreen(
                    onNavigateToLogbook = { peakId, peakName ->
                        pendingPeakId   = peakId
                        pendingPeakName = peakName
                        tabNavController.navigate(Screen.Logbook.route) {
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
                LogbookScreen(
                    onAscentClick       = { ascentId ->
                        navController.navigate(Screen.AscentDetail.createRoute(ascentId))
                    },
                    initialPeakId       = pendingPeakId,
                    initialPeakName     = pendingPeakName,
                    onPeakIdConsumed    = { pendingPeakId = null; pendingPeakName = null },
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
    onAvatarClick: () -> Unit,
) {
    val initials = user?.name?.let { name ->
        val parts = name.trim().split(" ")
        if (parts.size >= 2) "${parts.first().first()}${parts.last().first()}".uppercase()
        else name.first().uppercaseChar().toString()
    } ?: "U"

    CenterAlignedTopAppBar(
        // Logo stays perfectly centered regardless of action width — same guarantee
        // the web achieves with position:absolute + left:50% on the logo
        title = {
            PeakadexLogo(height = 32.dp)
        },
        actions = {
            Box(
                modifier = Modifier
                    .padding(end = 8.dp)
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            listOf(PeakBlueActive, PeakBlueLight)
                        )
                    )
                    .clickable(onClick = onAvatarClick),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = initials,
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        },
        colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
            containerColor = Color.White,
            titleContentColor = Color.Unspecified,
        ),
        // Subtle bottom border matching the web divider
        windowInsets = TopAppBarDefaults.windowInsets,
    )
    HorizontalDivider(thickness = 1.dp, color = Color.Black.copy(alpha = 0.07f))
}

// ── Bottom tab bar (M3 NavigationBar) ─────────────────────────────────────────

@Composable
private fun MainTabBar(
    currentRoute: String?,
    onTabSelected: (Screen) -> Unit,
) {
    val tabs = tabItems()
    Column {
        HorizontalDivider(thickness = 1.dp, color = Color.Black.copy(alpha = 0.07f))
        NavigationBar(
            // ③ M3 indicator restored — use the brand's light blue instead of the
            // theme's primaryContainer (which is green) to stay coherent with our palette
            containerColor = Color.White,
            tonalElevation = 0.dp,
        ) {
            tabs.forEach { tab ->
                val selected = currentRoute == tab.screen.route
                NavigationBarItem(
                    selected = selected,
                    onClick = { onTabSelected(tab.screen) },
                    icon = {
                        // Multi-colour SVG icons: tint = Unspecified preserves their colours.
                        // Alpha still signals active/inactive over the M3 indicator pill.
                        Icon(
                            painter = painterResource(tab.iconRes),
                            contentDescription = tab.label,
                            tint = Color.Unspecified,
                            modifier = Modifier
                                .size(24.dp)
                                .alpha(if (selected) 1f else 0.45f),
                        )
                    },
                    label = {
                        Text(
                            text = tab.label,
                            fontSize = 9.5.sp,
                            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                            letterSpacing = 0.02.sp,
                        )
                    },
                    // ③ Brand-blue pill indicator; label colours delegated to M3 tokens
                    colors = NavigationBarItemDefaults.colors(
                        indicatorColor        = PeakBlueContainer, // sky-100 — matches PeakBlueActive
                        selectedTextColor     = PeakBlueActive,
                        unselectedTextColor   = Color(0xFFB0B8C4),
                        selectedIconColor     = Color.Unspecified,
                        unselectedIconColor   = Color.Unspecified,
                    ),
                )
            }
        }
    }
}

// ── Icons ──────────────────────────────────────────────────────────────────────

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

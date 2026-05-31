package com.peakadex.app.feature.friends

import android.view.ViewTreeObserver
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.peakadex.app.R
import com.peakadex.app.core.model.FriendEntry
import com.peakadex.app.core.model.IncomingRequest
import com.peakadex.app.core.model.UserStub
import com.peakadex.app.AppContainer
import com.peakadex.app.core.ui.theme.PeakBackground
import com.peakadex.app.core.ui.theme.PeakBlueActive
import com.peakadex.app.core.ui.theme.PeakBlueLight

// ── Icons ──────────────────────────────────────────────────────────────────────

private val BackIcon: ImageVector by lazy {
    ImageVector.Builder("Back", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF374151)),
            strokeLineWidth = 2f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
            strokeLineJoin  = androidx.compose.ui.graphics.StrokeJoin.Round,
        ) {
            moveTo(15f, 18f); lineTo(9f, 12f); lineTo(15f, 6f)
        }
    }.build()
}

private val SearchIconVec: ImageVector by lazy {
    ImageVector.Builder("Search", 20.dp, 20.dp, 24f, 24f).apply {
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF9CA3AF)),
            strokeLineWidth = 2f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
        ) {
            moveTo(21f, 21f); lineTo(16.65f, 16.65f)
            moveTo(19f, 11f)
            curveTo(19f, 15.418f, 15.418f, 19f, 11f, 19f)
            curveTo(6.582f, 19f, 3f, 15.418f, 3f, 11f)
            curveTo(3f, 6.582f, 6.582f, 3f, 11f, 3f)
            curveTo(15.418f, 3f, 19f, 6.582f, 19f, 11f)
            close()
        }
    }.build()
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

@Composable
private fun UserAvatar(name: String, size: Int = 40) {
    val initials = name.trim().split(" ").take(2)
        .mapNotNull { it.firstOrNull()?.uppercaseChar() }
        .joinToString("")
    Box(
        modifier         = Modifier
            .size(size.dp)
            .clip(CircleShape)
            .background(Brush.linearGradient(listOf(PeakBlueActive, PeakBlueLight))),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text       = initials,
            color      = Color.White,
            fontSize   = (size * 0.36f).sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

// ── Section label ──────────────────────────────────────────────────────────────

@Composable
private fun SectionLabel(text: String) {
    Text(
        text          = text.uppercase(),
        fontSize      = 11.sp,
        fontWeight    = FontWeight.Bold,
        color         = Color(0xFF9CA3AF),
        letterSpacing = 0.8.sp,
        modifier      = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
    )
}

// ── Rule ───────────────────────────────────────────────────────────────────────

@Composable
private fun HRule() = HorizontalDivider(color = Color(0xFFF3F4F6), thickness = 1.dp)

// ── Action button ──────────────────────────────────────────────────────────────

private enum class BtnVariant { Primary, Ghost, Success }

@Composable
private fun FriendBtn(
    label: String,
    onClick: () -> Unit,
    variant: BtnVariant = BtnVariant.Primary,
) {
    val bg = when (variant) {
        BtnVariant.Primary -> PeakBlueActive
        BtnVariant.Ghost   -> Color(0xFFF3F4F6)
        BtnVariant.Success -> Color(0xFFF0FDF4)
    }
    val fg = when (variant) {
        BtnVariant.Primary -> Color.White
        BtnVariant.Ghost   -> Color(0xFF6B7280)
        BtnVariant.Success -> Color(0xFF16A34A)
    }
    Box(
        modifier         = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bg)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = fg)
    }
}

// ── Search bar ─────────────────────────────────────────────────────────────────

@Composable
private fun SearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    placeholder: String,
) {
    Row(
        modifier         = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFFF3F4F6))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector        = SearchIconVec,
            contentDescription = null,
            tint               = Color.Unspecified,
            modifier           = Modifier.size(18.dp),
        )
        Spacer(Modifier.width(8.dp))
        BasicTextField(
            value         = query,
            onValueChange = onQueryChange,
            singleLine    = true,
            textStyle     = LocalTextStyle.current.copy(fontSize = 16.sp, color = Color(0xFF111827)),
            cursorBrush   = SolidColor(PeakBlueActive),
            modifier      = Modifier.weight(1f),
            decorationBox = { inner ->
                if (query.isEmpty()) {
                    Text(placeholder, fontSize = 16.sp, color = Color(0xFF9CA3AF))
                }
                inner()
            },
        )
    }
}

// ── Rows ───────────────────────────────────────────────────────────────────────

@Composable
private fun SearchResultRow(
    user: UserStub,
    status: FriendshipStatus,
    onAdd: () -> Unit,
) {
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        UserAvatar(user.name, 36)
        Column(Modifier.weight(1f)) {
            Text(user.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF111827))
            if (user.username != null) {
                Text("@${user.username}", fontSize = 12.sp, color = Color(0xFF9CA3AF))
            }
        }
        when (status) {
            FriendshipStatus.NONE             -> FriendBtn(stringResource(R.string.friends_add), onAdd)
            FriendshipStatus.PENDING_SENT     -> FriendBtn(stringResource(R.string.friends_request_sent), {}, BtnVariant.Ghost)
            FriendshipStatus.PENDING_RECEIVED -> FriendBtn(stringResource(R.string.friends_accept), {}, BtnVariant.Success)
            FriendshipStatus.ACCEPTED         ->
                Text("✓ ${stringResource(R.string.friends_already_friends)}", fontSize = 12.sp, color = Color(0xFF16A34A), fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun IncomingRow(
    request: IncomingRequest,
    onAccept: () -> Unit,
    onReject: () -> Unit,
) {
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        UserAvatar(request.requester.name, 40)
        Column(Modifier.weight(1f)) {
            Text(request.requester.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF111827))
            if (request.requester.username != null) {
                Text("@${request.requester.username}", fontSize = 12.sp, color = Color(0xFF9CA3AF))
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            FriendBtn(stringResource(R.string.friends_accept), onAccept)
            FriendBtn(stringResource(R.string.friends_reject), onReject, BtnVariant.Ghost)
        }
    }
}

@Composable
private fun FriendRow(entry: FriendEntry, onRemove: () -> Unit) {
    var menuOpen by remember { mutableStateOf(false) }
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        UserAvatar(entry.friend.name, 40)
        Column(Modifier.weight(1f)) {
            Text(entry.friend.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF111827))
            if (entry.friend.username != null) {
                Text("@${entry.friend.username}", fontSize = 12.sp, color = Color(0xFF9CA3AF))
            }
        }
        Box {
            IconButton(onClick = { menuOpen = true }, modifier = Modifier.size(36.dp)) {
                Text("⋮", fontSize = 20.sp, color = Color(0xFF6B7280))
            }
            DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                DropdownMenuItem(
                    text    = { Text(stringResource(R.string.friends_remove), color = Color(0xFFEF4444), fontSize = 14.sp) },
                    onClick = { menuOpen = false; onRemove() },
                )
            }
        }
    }
}

// ── Friends tab content ────────────────────────────────────────────────────────

@Composable
private fun AmigosTabContent(vm: FriendsViewModel) {
    val state by vm.state.collectAsStateWithLifecycle()

    if (state.isLoading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = PeakBlueActive)
        }
        return
    }

    LazyColumn(
        modifier       = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 32.dp),
    ) {

        // ── Search ──────────────────────────────────────────────────────
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
            ) {
                SearchBar(
                    query         = state.searchQuery,
                    onQueryChange = vm::onSearchQueryChange,
                    placeholder   = stringResource(R.string.friends_search_placeholder),
                )
            }
            HRule()
        }

        // ── Search results ──────────────────────────────────────────────
        if (state.searchQuery.trim().length >= 2) {
            when {
                state.isSearching -> item {
                    Box(
                        Modifier.fillMaxWidth().background(Color.White).padding(16.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator(
                            modifier    = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color       = PeakBlueActive,
                        )
                    }
                    HRule()
                }
                state.searchResults.isEmpty() -> item {
                    Text(
                        text     = stringResource(R.string.friends_no_results),
                        fontSize = 13.sp,
                        color    = Color(0xFF9CA3AF),
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color.White)
                            .padding(horizontal = 16.dp, vertical = 14.dp),
                    )
                    HRule()
                }
                else -> {
                    items(state.searchResults, key = { "search-${it.id}" }) { user ->
                        Column(Modifier.background(Color.White)) {
                            SearchResultRow(
                                user   = user,
                                status = vm.friendshipStatus(user.id),
                                onAdd  = { vm.sendRequest(user) },
                            )
                            HRule()
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(8.dp)) }
        }

        // ── Incoming requests ───────────────────────────────────────────
        if (state.incoming.isNotEmpty()) {
            item {
                SectionLabel("${stringResource(R.string.friends_section_incoming)} · ${state.incoming.size}")
            }
            items(state.incoming, key = { "inc-${it.id}" }) { req ->
                Column(Modifier.background(Color.White)) {
                    IncomingRow(
                        request  = req,
                        onAccept = { vm.accept(req) },
                        onReject = { vm.reject(req.id) },
                    )
                    HRule()
                }
            }
            item { Spacer(Modifier.height(8.dp)) }
        }

        // ── Friends list ────────────────────────────────────────────────
        if (state.friends.isNotEmpty()) {
            item {
                SectionLabel("${stringResource(R.string.friends_section_friends)} · ${state.friends.size}")
            }
            items(state.friends, key = { "fr-${it.id}" }) { entry ->
                Column(Modifier.background(Color.White)) {
                    FriendRow(entry = entry, onRemove = { vm.removeFriend(entry.id) })
                    HRule()
                }
            }
        } else if (state.incoming.isEmpty() && state.searchQuery.isBlank()) {
            item {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 32.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text     = stringResource(R.string.friends_empty),
                        fontSize = 14.sp,
                        color    = Color(0xFF9CA3AF),
                    )
                }
            }
        }
    }
}

// ── Screen ─────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendsScreen(
    onBack: () -> Unit,
    initialTab: Int = 0,
    friendsVm: FriendsViewModel = viewModel(),
    cordadasVm: CordadasViewModel = viewModel(),
) {
    var selectedTab by remember { mutableIntStateOf(initialTab) }

    Scaffold(
        topBar = {
            Column {
            CenterAlignedTopAppBar(
                title          = {
                    Text(
                        stringResource(R.string.friends_title),
                        fontSize   = 17.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(BackIcon, contentDescription = "Volver", tint = Color.Unspecified)
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.White),
            )
            SecondaryTabRow(
                selectedTabIndex = selectedTab,
                containerColor   = Color.White,
                contentColor     = PeakBlueActive,
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick  = { selectedTab = 0 },
                    text     = {
                        Text(
                            stringResource(R.string.friends_title),
                            fontSize   = 13.sp,
                            fontWeight = if (selectedTab == 0) FontWeight.SemiBold else FontWeight.Normal,
                            color      = if (selectedTab == 0) PeakBlueActive else Color(0xFF6B7280),
                        )
                    },
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick  = { selectedTab = 1 },
                    text     = {
                        Text(
                            stringResource(R.string.cordadas_tab),
                            fontSize   = 13.sp,
                            fontWeight = if (selectedTab == 1) FontWeight.SemiBold else FontWeight.Normal,
                            color      = if (selectedTab == 1) PeakBlueActive else Color(0xFF6B7280),
                        )
                    },
                )
            }
            } // Column
        },
        containerColor = PeakBackground,
    ) { padding ->
        val currentUserId = AppContainer.authSession.currentUser.value?.id ?: ""
        // Read the raw navigation-bar inset from the Android view root. Reading it via
        // Scaffold's `padding` or `.navigationBarsPadding()` returns 0 here because the
        // surrounding Scaffold has already consumed the inset, and ModalBottomSheet content
        // inherits that consumed scope. Going through the root WindowInsets bypasses it.
        val view = LocalView.current
        val density = LocalDensity.current
        var bottomInsetPx by remember(view) {
            mutableIntStateOf(
                ViewCompat.getRootWindowInsets(view)
                    ?.getInsets(WindowInsetsCompat.Type.navigationBars())?.bottom ?: 0,
            )
        }
        DisposableEffect(view) {
            fun updateBottomInset() {
                bottomInsetPx = ViewCompat.getRootWindowInsets(view)
                    ?.getInsets(WindowInsetsCompat.Type.navigationBars())?.bottom ?: 0
            }

            updateBottomInset()
            val layoutListener = ViewTreeObserver.OnGlobalLayoutListener { updateBottomInset() }
            view.viewTreeObserver.addOnGlobalLayoutListener(layoutListener)
            ViewCompat.requestApplyInsets(view)

            onDispose {
                if (view.viewTreeObserver.isAlive) {
                    view.viewTreeObserver.removeOnGlobalLayoutListener(layoutListener)
                }
            }
        }
        val bottomInset = with(density) { bottomInsetPx.toDp() }
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (selectedTab) {
                0    -> AmigosTabContent(vm = friendsVm)
                else -> CordadasTab(currentUserId = currentUserId, bottomInset = bottomInset, vm = cordadasVm)
            }
        }
    }
}

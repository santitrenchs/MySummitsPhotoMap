package com.peakadex.app.feature.friends

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.layout.ContentScale
import coil3.compose.AsyncImage
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.peakadex.app.R
import com.peakadex.app.core.model.CordadaSummary
import com.peakadex.app.core.model.FriendEntry
import com.peakadex.app.core.model.IncomingRequest
import com.peakadex.app.core.model.UserStub
import com.peakadex.app.core.model.UserStatsResponse
import com.peakadex.app.AppContainer
import com.peakadex.app.core.ui.levelEmoji
import com.peakadex.app.core.ui.levelName
import com.peakadex.app.core.ui.theme.PeakBackground
import com.peakadex.app.core.ui.theme.PeakBlueActive
import com.peakadex.app.core.ui.theme.PeakGreenCTA
import com.peakadex.app.core.ui.theme.PeakBlueLight

// ── Semantic color tokens (single source for this package) ───────────────────────

internal val FriendsTextPrimary   = Color(0xFF111827)
internal val FriendsTextSecondary = Color(0xFF6B7280)
internal val FriendsTextMuted     = Color(0xFF9CA3AF)
internal val FriendsDivider       = Color(0xFFF3F4F6)
internal val FriendsSurfaceAlt    = Color(0xFFF3F4F6)

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
            stroke          = androidx.compose.ui.graphics.SolidColor(FriendsTextMuted),
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
fun UserAvatar(name: String, size: Int = 40, avatarUrl: String? = null) {
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
        if (!avatarUrl.isNullOrBlank()) {
            AsyncImage(
                model              = avatarUrl,
                contentDescription = name,
                contentScale       = ContentScale.Crop,
                modifier           = Modifier.fillMaxSize(),
            )
        } else {
            Text(
                text       = initials,
                color      = Color.White,
                fontSize   = (size * 0.36f).sp,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

// ── Section label ──────────────────────────────────────────────────────────────

@Composable
fun SectionLabel(text: String) {
    Text(
        text          = text.uppercase(),
        fontSize      = 11.sp,
        fontWeight    = FontWeight.Bold,
        color         = FriendsTextMuted,
        letterSpacing = 0.8.sp,
        modifier      = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
    )
}

// ── Rule ───────────────────────────────────────────────────────────────────────

@Composable
fun HRule() = HorizontalDivider(color = FriendsDivider, thickness = 1.dp)

// ── Action button ──────────────────────────────────────────────────────────────

private enum class BtnVariant { Primary, Ghost, Success }

@Composable
private fun FriendBtn(
    label: String,
    onClick: () -> Unit,
    variant: BtnVariant = BtnVariant.Primary,
) {
    val bg = when (variant) {
        BtnVariant.Primary -> PeakGreenCTA
        BtnVariant.Ghost   -> Color(0xFFF3F4F6)
        BtnVariant.Success -> Color(0xFFF0FDF4)
    }
    val fg = when (variant) {
        BtnVariant.Primary -> Color.White
        BtnVariant.Ghost   -> FriendsTextSecondary
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
            textStyle     = LocalTextStyle.current.copy(fontSize = 16.sp, color = FriendsTextPrimary),
            cursorBrush   = SolidColor(PeakBlueActive),
            modifier      = Modifier.weight(1f),
            decorationBox = { inner ->
                if (query.isEmpty()) {
                    Text(placeholder, fontSize = 16.sp, color = FriendsTextMuted)
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
    onAccept: () -> Unit,
) {
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        UserAvatar(user.name, 36, user.avatarUrl)
        Column(Modifier.weight(1f)) {
            Text(user.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = FriendsTextPrimary)
            if (user.username != null) {
                Text("@${user.username}", fontSize = 12.sp, color = FriendsTextMuted)
            }
        }
        when (status) {
            FriendshipStatus.NONE             -> FriendBtn(stringResource(R.string.friends_add), onAdd)
            FriendshipStatus.PENDING_SENT     ->
                Text(stringResource(R.string.friends_request_sent), fontSize = 12.sp, color = FriendsTextMuted, fontWeight = FontWeight.SemiBold)
            FriendshipStatus.PENDING_RECEIVED -> FriendBtn(stringResource(R.string.friends_accept), onAccept, BtnVariant.Success)
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
        UserAvatar(request.requester.name, 40, request.requester.avatarUrl)
        Column(Modifier.weight(1f)) {
            Text(request.requester.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = FriendsTextPrimary)
            if (request.requester.username != null) {
                Text("@${request.requester.username}", fontSize = 12.sp, color = FriendsTextMuted)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            FriendBtn(stringResource(R.string.friends_accept), onAccept)
            FriendBtn(stringResource(R.string.friends_reject), onReject, BtnVariant.Ghost)
        }
    }
}

@Composable
private fun FriendRow(entry: FriendEntry, onClick: () -> Unit, onRemove: () -> Unit) {
    var menuOpen by remember { mutableStateOf(false) }
    var confirmRemove by remember { mutableStateOf(false) }

    if (confirmRemove) {
        AlertDialog(
            onDismissRequest = { confirmRemove = false },
            title   = { Text(stringResource(R.string.friends_remove)) },
            text    = { Text(stringResource(R.string.friends_confirm_remove, entry.friend.name)) },
            confirmButton = {
                TextButton(onClick = { confirmRemove = false; onRemove() }) {
                    Text(stringResource(R.string.friends_remove), color = Color(0xFFEF4444))
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmRemove = false }) {
                    Text(stringResource(R.string.action_cancel))
                }
            },
        )
    }
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        UserAvatar(entry.friend.name, 40, entry.friend.avatarUrl)
        Column(Modifier.weight(1f)) {
            Text(entry.friend.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = FriendsTextPrimary)
            Text(
                levelName(entry.friend.levelIdx),
                fontSize = 12.sp,
                color = FriendsTextSecondary,
                fontWeight = FontWeight.Medium,
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.padding(top = 2.dp),
            ) {
                Text(
                    "${entry.friend.uniquePeaks} ${stringResource(R.string.home_leaderboard_col_peaks)}",
                    fontSize = 11.sp, color = FriendsTextMuted,
                )
                Text(
                    "${entry.friend.totalCairns} ${stringResource(R.string.home_leaderboard_col_cairns)}",
                    fontSize = 11.sp, color = FriendsTextMuted,
                )
                Text(
                    "${entry.friend.totalEp} ${stringResource(R.string.home_leaderboard_col_ep)}",
                    fontSize = 11.sp, color = FriendsTextMuted,
                )
            }
        }
        Box {
            IconButton(onClick = { menuOpen = true }, modifier = Modifier.size(36.dp)) {
                Text("⋮", fontSize = 20.sp, color = FriendsTextSecondary)
            }
            DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                DropdownMenuItem(
                    text    = { Text(stringResource(R.string.friends_remove), color = Color(0xFFEF4444), fontSize = 14.sp) },
                    onClick = { menuOpen = false; confirmRemove = true },
                )
            }
        }
    }
}

// ── Invite-friend-by-email sheet ─────────────────────────────────────────────────

@Composable
private fun InviteFriendSheet(
    inviteState: InviteState,
    onDismiss: () -> Unit,
    onSend: (String) -> Unit,
) {
    var email by remember { mutableStateOf("") }
    val valid = email.contains("@") && email.contains(".")
    val sending = inviteState == InviteState.SENDING
    val isSuccess = inviteState == InviteState.INVITED

    // Auto-close shortly after a successful send.
    LaunchedEffect(isSuccess) {
        if (isSuccess) {
            kotlinx.coroutines.delay(1400)
            onDismiss()
        }
    }

    CordadaModalSheet(onDismiss = onDismiss) {
        Column(
            modifier            = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(stringResource(R.string.friends_invite_title), fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
            Text(stringResource(R.string.friends_invite_subtitle), fontSize = 13.sp, color = FriendsTextSecondary)
            OutlinedTextField(
                value         = email,
                onValueChange = { email = it },
                label         = { Text(stringResource(R.string.friends_invite_email_hint)) },
                singleLine    = true,
                enabled       = !sending && !isSuccess,
                modifier      = Modifier.fillMaxWidth(),
            )

            // Status feedback
            val feedback: Pair<String, Color>? = when (inviteState) {
                InviteState.INVITED            -> stringResource(R.string.friends_invite_ok) to Color(0xFF15803D)
                InviteState.ALREADY_REGISTERED -> stringResource(R.string.friends_invite_already_registered) to FriendsTextSecondary
                InviteState.CANNOT_INVITE_SELF -> stringResource(R.string.friends_invite_self) to Color(0xFFDC2626)
                InviteState.ERROR              -> stringResource(R.string.friends_invite_error) to Color(0xFFDC2626)
                else                           -> null
            }
            feedback?.let { (msg, color) ->
                Text(msg, fontSize = 13.sp, color = color, fontWeight = FontWeight.Medium)
            }

            Button(
                onClick  = { if (valid && !sending) onSend(email.trim()) },
                enabled  = valid && !sending && !isSuccess,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors   = ButtonDefaults.buttonColors(containerColor = PeakGreenCTA),
            ) {
                if (sending) {
                    CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                } else {
                    Text(stringResource(R.string.friends_invite_send_btn), fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

// ── Friend stats sheet ───────────────────────────────────────────────────────────

@Composable
private fun FriendStatsSheet(stats: UserStatsResponse, onDismiss: () -> Unit) {
    CordadaModalSheet(onDismiss = onDismiss) {
        Column(
            modifier            = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Header: avatar + name + level
            Row(
                verticalAlignment     = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                UserAvatar(stats.user.name, 52, stats.user.avatarUrl)
                Column(Modifier.weight(1f)) {
                    Text(stats.user.name, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = FriendsTextPrimary)
                    Text("${levelEmoji(stats.levelIdx)} ${levelName(stats.levelIdx)}", fontSize = 13.sp, color = FriendsTextSecondary, fontWeight = FontWeight.Medium)
                }
            }

            // Stats grid (2 columns)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatCell(stats.uniquePeaks.toString(), stringResource(R.string.stats_unique_peaks), Modifier.weight(1f))
                StatCell(stats.totalAscents.toString(), stringResource(R.string.stats_total_ascents), Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatCell("${stats.maxAltitudeM} m", stringResource(R.string.stats_max_altitude), Modifier.weight(1f))
                StatCell(stats.totalEp.toString(), stringResource(R.string.stats_total_ep), Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun StatCell(value: String, label: String, modifier: Modifier = Modifier) {
    Column(
        modifier            = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFFF3F4F6))
            .padding(vertical = 14.dp, horizontal = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(value, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = FriendsTextPrimary)
        Text(label, fontSize = 12.sp, color = FriendsTextSecondary)
    }
}

// ── FAB speed-dial (Invitar amigo / Crear cordada) ───────────────────────────────

@Composable
private fun ActionSpeedDialSheet(
    onDismiss: () -> Unit,
    onInviteFriend: () -> Unit,
    onCreateCordada: () -> Unit,
) {
    CordadaModalSheet(onDismiss = onDismiss) {
        Column(Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
            SpeedDialRow(
                emoji = "👤",
                label = stringResource(R.string.friends_action_invite),
                onClick = onInviteFriend,
            )
            HRule()
            SpeedDialRow(
                emoji = "🧗",
                label = stringResource(R.string.friends_action_create_cordada),
                onClick = onCreateCordada,
            )
        }
    }
}

@Composable
private fun SpeedDialRow(emoji: String, label: String, onClick: () -> Unit) {
    Row(
        modifier              = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(
            modifier         = Modifier.size(40.dp).clip(CircleShape).background(Color(0xFFEFF6FF)),
            contentAlignment = Alignment.Center,
        ) {
            Text(emoji, fontSize = 18.sp)
        }
        Text(label, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = FriendsTextPrimary)
    }
}

// ── Screen ─────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendsScreen(
    onBack: () -> Unit,
    friendsVm: FriendsViewModel = viewModel(),
    cordadasVm: CordadasViewModel = viewModel(),
) {
    val friendsState by friendsVm.state.collectAsStateWithLifecycle()
    val cordadasState by cordadasVm.state.collectAsStateWithLifecycle()
    val currentUserId = AppContainer.authSession.currentUser.value?.id ?: ""

    var showActionSheet by remember { mutableStateOf(false) }
    var showCreateSheet by remember { mutableStateOf(false) }
    var showInviteFriendSheet by remember { mutableStateOf(false) }

    val snackbarHostState = remember { SnackbarHostState() }
    val genericError = stringResource(R.string.friends_generic_error)
    val createError = stringResource(R.string.cordadas_create_error)

    LaunchedEffect(cordadasState.error) {
        cordadasState.error?.let {
            snackbarHostState.showSnackbar(createError)
            cordadasVm.clearError()
        }
    }
    LaunchedEffect(friendsState.error) {
        if (!friendsState.isLoading && friendsState.error != null) {
            snackbarHostState.showSnackbar(genericError)
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
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
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick        = { showActionSheet = true },
                shape          = CircleShape,
                containerColor = PeakGreenCTA,
                contentColor   = Color.White,
            ) {
                Icon(PlusSmallIcon, contentDescription = stringResource(R.string.friends_fab_add), tint = Color.White)
            }
        },
        containerColor = PeakBackground,
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            if (friendsState.isLoading) {
                FriendsSkeleton()
            } else {
                UnifiedList(
                    friendsState  = friendsState,
                    cordadasState = cordadasState,
                    friendsVm     = friendsVm,
                    cordadasVm    = cordadasVm,
                )
            }
        }
    }

    // FAB speed-dial
    if (showActionSheet) {
        ActionSpeedDialSheet(
            onDismiss       = { showActionSheet = false },
            onInviteFriend  = { showActionSheet = false; showInviteFriendSheet = true },
            onCreateCordada = { showActionSheet = false; showCreateSheet = true },
        )
    }

    // Invite friend by email
    if (showInviteFriendSheet) {
        InviteFriendSheet(
            inviteState = friendsState.inviteState,
            onDismiss   = {
                showInviteFriendSheet = false
                friendsVm.resetInviteState()
            },
            onSend      = { email -> friendsVm.inviteFriendByEmail(email) },
        )
    }

    // Create cordada
    if (showCreateSheet) {
        CreateCordadaSheet(
            friends   = friendsState.friends,
            onDismiss = { showCreateSheet = false },
            onCreate  = { name, desc, memberIds, avatarBytes ->
                showCreateSheet = false
                cordadasVm.createCordada(name, desc, memberIds, avatarBytes)
            },
        )
    }

    // Cordada detail (opened from a cordada row)
    CordadaDetailHost(currentUserId = currentUserId, vm = cordadasVm)

    // Friend stats (opened from a friend row)
    if (friendsState.isLoadingStats) {
        Box(
            Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.3f)),
            contentAlignment = Alignment.Center,
        ) { CircularProgressIndicator(color = Color.White) }
    } else if (friendsState.selectedStats != null) {
        FriendStatsSheet(stats = friendsState.selectedStats!!, onDismiss = friendsVm::closeUserStats)
    }
}

// ── Unified list (friends + cordadas in one column) ──────────────────────────────

// A single chat-style entry that can be either a friend or a cordada, so both
// render intermixed in one list (WhatsApp-style) sorted by name.
private sealed interface ChatEntry {
    val sortName: String
    val key: String
    data class Friend(val entry: FriendEntry) : ChatEntry {
        override val sortName get() = entry.friend.name
        override val key get() = "fr-${entry.id}"
    }
    data class Group(val cordada: CordadaSummary) : ChatEntry {
        override val sortName get() = cordada.name
        override val key get() = "cor-${cordada.id}"
    }
}

@Composable
private fun UnifiedList(
    friendsState: FriendsUiState,
    cordadasState: CordadasUiState,
    friendsVm: FriendsViewModel,
    cordadasVm: CordadasViewModel,
) {
    LazyColumn(
        modifier       = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 96.dp),
    ) {
        // ── Search (friends only for now; unified search lands in Phase 3) ──
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
            ) {
                SearchBar(
                    query         = friendsState.searchQuery,
                    onQueryChange = friendsVm::onSearchQueryChange,
                    placeholder   = stringResource(R.string.friends_search_placeholder),
                )
            }
            HRule()
        }

        // ── Search results (cordadas [local] + users [remote]) ────────────
        val query = friendsState.searchQuery.trim()
        if (query.length >= 2) {
            val cordadaMatches = cordadasState.cordadas.filter {
                it.name.contains(query, ignoreCase = true)
            }

            // Cordada matches (local filter of already-loaded cordadas)
            if (cordadaMatches.isNotEmpty()) {
                item { SectionLabel(stringResource(R.string.cordadas_tab)) }
                items(cordadaMatches, key = { "scor-${it.id}" }) { item ->
                    Column(Modifier.animateItem().background(Color.White)) {
                        CordadaCard(item = item) { cordadasVm.openDetail(item.id) }
                        HRule()
                    }
                }
            }

            // User matches (remote search)
            if (friendsState.isSearching) {
                item {
                    Box(
                        Modifier.fillMaxWidth().background(Color.White).padding(16.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = PeakBlueActive)
                    }
                    HRule()
                }
            } else if (friendsState.searchResults.isNotEmpty()) {
                item { SectionLabel(stringResource(R.string.friends_section_friends)) }
                items(friendsState.searchResults, key = { "search-${it.id}" }) { user ->
                    Column(Modifier.animateItem().background(Color.White)) {
                        SearchResultRow(
                            user     = user,
                            status   = friendsVm.friendshipStatus(user.id),
                            onAdd    = { friendsVm.sendRequest(user) },
                            onAccept = {
                                friendsState.incoming.firstOrNull { it.requester.id == user.id }
                                    ?.let { friendsVm.accept(it) }
                            },
                        )
                        HRule()
                    }
                }
            }

            // No matches at all
            if (!friendsState.isSearching &&
                friendsState.searchResults.isEmpty() &&
                cordadaMatches.isEmpty()
            ) {
                item {
                    Text(
                        text     = stringResource(R.string.friends_no_results),
                        fontSize = 13.sp,
                        color    = FriendsTextMuted,
                        modifier = Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 16.dp, vertical = 14.dp),
                    )
                    HRule()
                }
            }
            item { Spacer(Modifier.height(8.dp)) }
        }

        // ── Solicitudes (friend requests + cordada invites combined) ───────
        val totalRequests = friendsState.incoming.size + cordadasState.pendingInvites.size
        if (totalRequests > 0) {
            item { SectionLabel("${stringResource(R.string.friends_section_incoming)} · $totalRequests") }
            items(friendsState.incoming, key = { "inc-${it.id}" }) { req ->
                Column(Modifier.animateItem().background(Color.White)) {
                    IncomingRow(
                        request  = req,
                        onAccept = { friendsVm.accept(req) },
                        onReject = { friendsVm.reject(req.id) },
                    )
                    HRule()
                }
            }
            items(cordadasState.pendingInvites, key = { "cinv-${it.cordadaId}" }) { invite ->
                Column(Modifier.animateItem().background(Color.White)) {
                    InviteCard(
                        invite   = invite,
                        onAccept = { cordadasVm.respondToInvite(invite.cordadaId, "ACCEPTED") },
                        onReject = { cordadasVm.respondToInvite(invite.cordadaId, "REJECTED") },
                    )
                    HRule()
                }
            }
            item { Spacer(Modifier.height(8.dp)) }
        }

        // ── Amigos + Cordadas en una sola lista (estilo WhatsApp) ───────────
        val chats: List<ChatEntry> =
            (friendsState.friends.map { ChatEntry.Friend(it) } +
                cordadasState.cordadas.map { ChatEntry.Group(it) })
                .sortedBy { it.sortName.lowercase() }
        if (chats.isNotEmpty()) {
            item { SectionLabel("${stringResource(R.string.friends_section_friends)} · ${chats.size}") }
            items(chats, key = { it.key }) { chat ->
                Column(Modifier.animateItem().background(Color.White)) {
                    when (chat) {
                        is ChatEntry.Friend -> FriendRow(
                            entry    = chat.entry,
                            onClick  = { friendsVm.openUserStats(chat.entry.friend.id) },
                            onRemove = { friendsVm.removeFriend(chat.entry.id) },
                        )
                        is ChatEntry.Group -> CordadaCard(item = chat.cordada) {
                            cordadasVm.openDetail(chat.cordada.id)
                        }
                    }
                    HRule()
                }
            }
        }

        // ── Empty state ─────────────────────────────────────────────────────
        if (friendsState.friends.isEmpty() &&
            cordadasState.cordadas.isEmpty() &&
            totalRequests == 0 &&
            friendsState.searchQuery.isBlank()
        ) {
            item {
                Column(
                    modifier            = Modifier.fillMaxWidth().padding(horizontal = 32.dp, vertical = 56.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Box(
                        modifier         = Modifier.size(72.dp).clip(CircleShape).background(Color(0xFFEFF6FF)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("🧗", fontSize = 32.sp)
                    }
                    Text(
                        stringResource(R.string.friends_empty),
                        fontSize   = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color      = FriendsTextPrimary,
                    )
                    Text(
                        stringResource(R.string.friends_empty_subtitle),
                        fontSize  = 13.sp,
                        color     = FriendsTextMuted,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }
    }
}

// ── Loading skeleton (shimmer) ────────────────────────────────────────────────────

@Composable
private fun Modifier.shimmer(): Modifier {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val x by transition.animateFloat(
        initialValue  = -2f,
        targetValue   = 2f,
        animationSpec = infiniteRepeatable(
            animation  = tween(1100, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "shimmer-x",
    )
    val base      = Color(0xFFE5E7EB)
    val highlight = Color(0xFFF3F4F6)
    return this.background(
        Brush.linearGradient(
            colors = listOf(base, highlight, base),
            start  = Offset(x * 200f, 0f),
            end    = Offset(x * 200f + 200f, 0f),
        ),
    )
}

@Composable
private fun SkeletonBox(width: Dp, height: Dp) {
    Box(
        Modifier
            .size(width, height)
            .clip(RoundedCornerShape(6.dp))
            .shimmer(),
    )
}

@Composable
private fun FriendsSkeleton() {
    Column(Modifier.fillMaxSize().background(Color.White)) {
        Box(Modifier.fillMaxWidth().padding(16.dp)) {
            Box(Modifier.fillMaxWidth().height(40.dp).clip(RoundedCornerShape(12.dp)).shimmer())
        }
        HRule()
        repeat(6) {
            Row(
                modifier              = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment     = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Box(Modifier.size(40.dp).clip(CircleShape).shimmer())
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    SkeletonBox(140.dp, 13.dp)
                    SkeletonBox(90.dp, 11.dp)
                }
            }
            HRule()
        }
    }
}

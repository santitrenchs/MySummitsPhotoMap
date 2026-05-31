package com.peakadex.app.feature.friends

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.peakadex.app.R
import com.peakadex.app.core.model.CordadaDetail
import com.peakadex.app.core.model.CordadaInvite
import com.peakadex.app.core.model.CordadaMemberRanking
import com.peakadex.app.core.model.CordadaSummary
import com.peakadex.app.core.model.UserStub
import com.peakadex.app.core.ui.theme.PeakBlueActive
import com.peakadex.app.core.ui.theme.PeakBlueLight
import com.peakadex.app.core.ui.theme.PeakClimbedGreen

// ── Helpers ────────────────────────────────────────────────────────────────────

@Composable
private fun CordadaAvatar(name: String, size: Int = 40) {
    val initials = name.trim().split(" ").take(2)
        .mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("")
    Box(
        modifier         = Modifier
            .size(size.dp)
            .clip(CircleShape)
            .background(Brush.linearGradient(listOf(Color(0xFF059669), Color(0xFF34D399)))),
        contentAlignment = Alignment.Center,
    ) {
        Text(initials, color = Color.White, fontSize = (size * 0.36f).sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun UserAvatar(name: String, size: Int = 36) {
    val initials = name.trim().split(" ").take(2)
        .mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("")
    Box(
        modifier         = Modifier
            .size(size.dp)
            .clip(CircleShape)
            .background(Brush.linearGradient(listOf(PeakBlueActive, PeakBlueLight))),
        contentAlignment = Alignment.Center,
    ) {
        Text(initials, color = Color.White, fontSize = (size * 0.36f).sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text.uppercase(), fontSize = 11.sp, fontWeight = FontWeight.Bold,
        color = Color(0xFF9CA3AF), letterSpacing = 0.8.sp,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
    )
}

@Composable
private fun HRule() = HorizontalDivider(color = Color(0xFFF3F4F6), thickness = 1.dp)

private val LEVEL_EMOJIS = listOf("🌱", "🥾", "🧭", "⛰️", "🏔️", "👑")
private fun levelEmoji(idx: Int) = LEVEL_EMOJIS.getOrElse(idx - 1) { "🌱" }

// ── Cordada list card ──────────────────────────────────────────────────────────

@Composable
private fun CordadaCard(item: CordadaSummary, onClick: () -> Unit) {
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        CordadaAvatar(item.name, 44)
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(item.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF111827), maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (item.myRole == "OWNER") {
                    Box(
                        modifier         = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(Color(0xFFF0FDF4))
                            .padding(horizontal = 5.dp, vertical = 1.dp),
                    ) {
                        Text(stringResource(R.string.cordadas_owner_badge), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF059669))
                    }
                }
            }
            Text(
                stringResource(R.string.cordadas_members, item.memberCount),
                fontSize = 12.sp, color = Color(0xFF9CA3AF),
            )
        }
        Icon(
            imageVector        = ChevronRightIcon,
            contentDescription = null,
            tint               = Color(0xFFD1D5DB),
            modifier           = Modifier.size(18.dp),
        )
    }
}

// ── Invite card ────────────────────────────────────────────────────────────────

@Composable
private fun InviteCard(invite: CordadaInvite, onAccept: () -> Unit, onReject: () -> Unit) {
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        CordadaAvatar(invite.name, 40)
        Column(Modifier.weight(1f)) {
            Text(invite.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF111827))
            Text(
                stringResource(R.string.cordadas_invite_from, invite.ownerName),
                fontSize = 12.sp, color = Color(0xFF9CA3AF),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            SmallBtn(stringResource(R.string.friends_accept), onAccept)
            SmallBtn(stringResource(R.string.friends_reject), onReject, ghost = true)
        }
    }
}

@Composable
private fun SmallBtn(label: String, onClick: () -> Unit, ghost: Boolean = false) {
    Box(
        modifier         = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(if (ghost) Color(0xFFF3F4F6) else PeakBlueActive)
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 6.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = if (ghost) Color(0xFF6B7280) else Color.White)
    }
}

// ── Ranking row ────────────────────────────────────────────────────────────────

@Composable
private fun RankingRow(position: Int, member: CordadaMemberRanking, isOwner: Boolean, canExpel: Boolean, onExpel: () -> Unit) {
    var menuOpen by remember { mutableStateOf(false) }
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        // Position
        Text(
            text      = "#$position",
            fontSize  = 12.sp,
            fontWeight = FontWeight.Bold,
            color     = if (position <= 3) PeakClimbedGreen else Color(0xFF9CA3AF),
            modifier  = Modifier.width(28.dp),
        )
        UserAvatar(member.name, 36)
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(member.name, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF111827), maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (member.isCurrentUser) Text("(tú)", fontSize = 11.sp, color = Color(0xFF9CA3AF))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("${levelEmoji(member.levelIdx)} ${member.uniquePeaks} cimas", fontSize = 11.sp, color = Color(0xFF6B7280))
                Text("${member.totalEp} EP", fontSize = 11.sp, color = Color(0xFF6B7280))
            }
        }
        if (member.isOwner) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(4.dp))
                    .background(Color(0xFFF0FDF4))
                    .padding(horizontal = 5.dp, vertical = 1.dp),
            ) {
                Text(stringResource(R.string.cordadas_owner_badge), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF059669))
            }
        } else if (canExpel) {
            Box {
                IconButton(onClick = { menuOpen = true }, modifier = Modifier.size(32.dp)) {
                    Text("⋮", fontSize = 18.sp, color = Color(0xFF9CA3AF))
                }
                DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                    DropdownMenuItem(
                        text    = { Text(stringResource(R.string.cordadas_expel), color = Color(0xFFEF4444), fontSize = 14.sp) },
                        onClick = { menuOpen = false; onExpel() },
                    )
                }
            }
        }
    }
}

// ── Icons ──────────────────────────────────────────────────────────────────────

private val ChevronRightIcon: ImageVector by lazy {
    ImageVector.Builder("ChevronRight", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFFD1D5DB)),
            strokeLineWidth = 2f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
            strokeLineJoin  = androidx.compose.ui.graphics.StrokeJoin.Round,
        ) { moveTo(9f, 6f); lineTo(15f, 12f); lineTo(9f, 18f) }
    }.build()
}

private val PlusSmallIcon: ImageVector by lazy {
    ImageVector.Builder("Plus", 20.dp, 20.dp, 24f, 24f).apply {
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color.White),
            strokeLineWidth = 2f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
        ) {
            moveTo(12f, 5f); lineTo(12f, 19f)
            moveTo(5f, 12f); lineTo(19f, 12f)
        }
    }.build()
}

private val SearchIconSmall: ImageVector by lazy {
    ImageVector.Builder("Search", 18.dp, 18.dp, 24f, 24f).apply {
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

// ── Create sheet ───────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreateCordadaSheet(bottomInset: Dp = 0.dp, onDismiss: () -> Unit, onCreate: (name: String, desc: String?) -> Unit) {
    var name by remember { mutableStateOf("") }
    var desc by remember { mutableStateOf("") }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor   = Color.White,
        contentWindowInsets = { WindowInsets(0) },
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .imePadding()
                .padding(horizontal = 20.dp)
                .padding(bottom = bottomInset + 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(stringResource(R.string.cordadas_create_title), fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
            OutlinedTextField(
                value         = name,
                onValueChange = { if (it.length <= 60) name = it },
                label         = { Text(stringResource(R.string.cordadas_name_hint)) },
                singleLine    = true,
                modifier      = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value         = desc,
                onValueChange = { if (it.length <= 200) desc = it },
                label         = { Text(stringResource(R.string.cordadas_desc_hint)) },
                minLines      = 2,
                maxLines      = 4,
                modifier      = Modifier.fillMaxWidth(),
            )
            Button(
                onClick  = { if (name.isNotBlank()) onCreate(name.trim(), desc.ifBlank { null }) },
                enabled  = name.isNotBlank(),
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors   = ButtonDefaults.buttonColors(containerColor = PeakBlueActive),
            ) {
                Text(stringResource(R.string.cordadas_create_btn), fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

// ── Invite sheet ───────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun InviteSheet(
    query: String,
    results: List<UserStub>,
    isSearching: Boolean,
    sentIds: Set<String>,
    bottomInset: Dp = 0.dp,
    onQueryChange: (String) -> Unit,
    onInvite: (UserStub) -> Unit,
    onDismiss: () -> Unit,
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color.White,
        contentWindowInsets = { WindowInsets(0) },
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .imePadding()
                .padding(horizontal = 16.dp),
        ) {
            Text(
                stringResource(R.string.cordadas_invite_title),
                fontSize   = 17.sp,
                fontWeight = FontWeight.SemiBold,
                modifier   = Modifier.padding(bottom = 12.dp),
            )
            // Search bar
            Row(
                modifier         = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFFF3F4F6))
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(SearchIconSmall, contentDescription = null, tint = Color.Unspecified, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                BasicTextField(
                    value         = query,
                    onValueChange = onQueryChange,
                    singleLine    = true,
                    textStyle     = LocalTextStyle.current.copy(fontSize = 16.sp, color = Color(0xFF111827)),
                    cursorBrush   = SolidColor(PeakBlueActive),
                    modifier      = Modifier.weight(1f),
                    decorationBox = { inner ->
                        if (query.isEmpty()) Text(stringResource(R.string.cordadas_invite_search), fontSize = 16.sp, color = Color(0xFF9CA3AF))
                        inner()
                    },
                )
            }
            Spacer(Modifier.height(8.dp))
            // Results
            if (isSearching) {
                Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = PeakBlueActive)
                }
            } else {
                results.forEach { user ->
                    val sent = user.id in sentIds
                    Row(
                        modifier          = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        UserAvatar(user.name, 36)
                        Column(Modifier.weight(1f)) {
                            Text(user.name, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF111827))
                            if (user.username != null) Text("@${user.username}", fontSize = 11.sp, color = Color(0xFF9CA3AF))
                        }
                        if (sent) {
                            Text(stringResource(R.string.friends_request_sent), fontSize = 12.sp, color = Color(0xFF9CA3AF))
                        } else {
                            SmallBtn(stringResource(R.string.cordadas_invite_send), onClick = { onInvite(user) })
                        }
                    }
                    HRule()
                }
            }
            Spacer(Modifier.height(bottomInset + 16.dp))
        }
    } // ModalBottomSheet
}

// ── Detail sheet ───────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CordadaDetailSheet(
    detail: CordadaDetail,
    bottomInset: Dp = 0.dp,
    inviteQuery: String,
    inviteResults: List<UserStub>,
    isSearchingInvite: Boolean,
    inviteSentIds: Set<String>,
    currentUserId: String,
    onInviteQueryChange: (String) -> Unit,
    onInvite: (UserStub) -> Unit,
    onExpel: (String) -> Unit,
    onLeave: () -> Unit,
    onDelete: () -> Unit,
    onDismiss: () -> Unit,
) {
    var showInviteSheet   by remember { mutableStateOf(false) }
    var showConfirmLeave  by remember { mutableStateOf(false) }
    var showConfirmDelete by remember { mutableStateOf(false) }
    var expelTarget       by remember { mutableStateOf<CordadaMemberRanking?>(null) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor   = Color.White,
        contentWindowInsets = { WindowInsets(0) },
        dragHandle = {
            Box(
                modifier         = Modifier.fillMaxWidth().height(7.dp).background(Color(0xFF059669)),
                contentAlignment = Alignment.Center,
            ) {
                Box(Modifier.width(32.dp).height(3.dp).clip(RoundedCornerShape(2.dp)).background(Color.White.copy(alpha = 0.6f)))
            }
        },
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
        ) {
            // Header
            Row(
                modifier          = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                CordadaAvatar(detail.name, 48)
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(detail.name, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFF111827))
                        if (detail.isOwner) {
                            Box(
                                Modifier.clip(RoundedCornerShape(4.dp)).background(Color(0xFFF0FDF4)).padding(horizontal = 5.dp, vertical = 1.dp)
                            ) {
                                Text(stringResource(R.string.cordadas_owner_badge), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF059669))
                            }
                        }
                    }
                    if (!detail.description.isNullOrBlank()) {
                        Text(detail.description, fontSize = 12.sp, color = Color(0xFF6B7280))
                    }
                }
                if (detail.isOwner) {
                    SmallBtn(stringResource(R.string.cordadas_invite_btn), onClick = { showInviteSheet = true })
                }
            }
            HRule()

            // Ranking
            SectionLabel("${stringResource(R.string.cordadas_tab)} · ${detail.members.size}")
            detail.members.forEachIndexed { idx, member ->
                RankingRow(
                    position  = idx + 1,
                    member    = member,
                    isOwner   = detail.isOwner,
                    canExpel  = detail.isOwner && !member.isOwner && !member.isCurrentUser,
                    onExpel   = { expelTarget = member },
                )
                if (idx < detail.members.lastIndex) HRule()
            }
            HRule()
            Spacer(Modifier.height(8.dp))

            // Footer actions
            if (detail.isOwner) {
                TextButton(
                    onClick  = { showConfirmDelete = true },
                    modifier = Modifier.fillMaxWidth(),
                    colors   = ButtonDefaults.textButtonColors(contentColor = Color(0xFFEF4444)),
                ) { Text(stringResource(R.string.cordadas_delete), fontWeight = FontWeight.SemiBold) }
            } else {
                TextButton(
                    onClick  = { showConfirmLeave = true },
                    modifier = Modifier.fillMaxWidth(),
                    colors   = ButtonDefaults.textButtonColors(contentColor = Color(0xFFEF4444)),
                ) { Text(stringResource(R.string.cordadas_leave), fontWeight = FontWeight.SemiBold) }
            }
            Spacer(Modifier.height(bottomInset + 8.dp))
        }
    }

    // Invite sheet
    if (showInviteSheet) {
        InviteSheet(
            query         = inviteQuery,
            results       = inviteResults,
            isSearching   = isSearchingInvite,
            sentIds       = inviteSentIds,
            bottomInset   = bottomInset,
            onQueryChange = onInviteQueryChange,
            onInvite      = onInvite,
            onDismiss     = { showInviteSheet = false },
        )
    }

    // Confirm dialogs
    if (showConfirmLeave) {
        AlertDialog(
            onDismissRequest = { showConfirmLeave = false },
            text             = { Text(stringResource(R.string.cordadas_confirm_leave)) },
            confirmButton    = {
                TextButton(onClick = { showConfirmLeave = false; onLeave() }, colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFEF4444))) {
                    Text(stringResource(R.string.cordadas_leave))
                }
            },
            dismissButton    = { TextButton(onClick = { showConfirmLeave = false }) { Text(stringResource(R.string.action_cancel)) } },
        )
    }
    if (showConfirmDelete) {
        AlertDialog(
            onDismissRequest = { showConfirmDelete = false },
            text             = { Text(stringResource(R.string.cordadas_confirm_delete)) },
            confirmButton    = {
                TextButton(onClick = { showConfirmDelete = false; onDelete() }, colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFEF4444))) {
                    Text(stringResource(R.string.cordadas_delete))
                }
            },
            dismissButton    = { TextButton(onClick = { showConfirmDelete = false }) { Text(stringResource(R.string.action_cancel)) } },
        )
    }
    expelTarget?.let { target ->
        AlertDialog(
            onDismissRequest = { expelTarget = null },
            text             = { Text(stringResource(R.string.cordadas_confirm_expel)) },
            confirmButton    = {
                TextButton(onClick = { expelTarget = null; onExpel(target.userId) }, colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFEF4444))) {
                    Text(stringResource(R.string.cordadas_expel))
                }
            },
            dismissButton    = { TextButton(onClick = { expelTarget = null }) { Text(stringResource(R.string.action_cancel)) } },
        )
    }
}

// ── Main tab content ───────────────────────────────────────────────────────────

@Composable
fun CordadasTab(
    currentUserId: String,
    bottomInset: Dp = 0.dp,
    vm: CordadasViewModel = viewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()
    var showCreateSheet by remember { mutableStateOf(false) }

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
        // ── "Nueva cordada" row ─────────────────────────────────────────────
        item {
            Row(
                modifier          = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
                    .clickable { showCreateSheet = true }
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Box(
                    modifier         = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFEFF6FF)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(PlusSmallIcon, contentDescription = null, tint = PeakBlueActive, modifier = Modifier.size(18.dp))
                }
                Text(
                    stringResource(R.string.cordadas_new),
                    fontSize   = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color      = PeakBlueActive,
                )
            }
            HRule()
            Spacer(Modifier.height(8.dp))
        }

        // ── Pending invites ─────────────────────────────────────────────────
        if (state.pendingInvites.isNotEmpty()) {
            item { SectionLabel("${stringResource(R.string.cordadas_invites_section)} · ${state.pendingInvites.size}") }
            items(state.pendingInvites, key = { "inv-${it.cordadaId}" }) { invite ->
                Column(Modifier.background(Color.White)) {
                    InviteCard(
                        invite   = invite,
                        onAccept = { vm.respondToInvite(invite.cordadaId, "ACCEPTED") },
                        onReject = { vm.respondToInvite(invite.cordadaId, "REJECTED") },
                    )
                    HRule()
                }
            }
            item { Spacer(Modifier.height(8.dp)) }
        }

        // ── Cordadas list ───────────────────────────────────────────────────
        if (state.cordadas.isNotEmpty()) {
            item { SectionLabel("${stringResource(R.string.cordadas_tab)} · ${state.cordadas.size}") }
            items(state.cordadas, key = { it.id }) { item ->
                Column(Modifier.background(Color.White)) {
                    CordadaCard(item = item) { vm.openDetail(item.id) }
                    HRule()
                }
            }
        } else if (state.pendingInvites.isEmpty()) {
            item {
                Box(
                    Modifier.fillParentMaxWidth().padding(horizontal = 16.dp, vertical = 40.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(stringResource(R.string.cordadas_empty), fontSize = 14.sp, color = Color(0xFF9CA3AF))
                }
            }
        }
    }

    // Create sheet
    if (showCreateSheet) {
        CreateCordadaSheet(
            bottomInset = bottomInset,
            onDismiss = { showCreateSheet = false },
            onCreate  = { name, desc ->
                showCreateSheet = false
                vm.createCordada(name, desc)
            },
        )
    }

    // Detail sheet
    val detail = state.selectedDetail
    if (detail != null || state.isLoadingDetail) {
        if (state.isLoadingDetail) {
            Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.3f)), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color.White)
            }
        } else if (detail != null) {
            CordadaDetailSheet(
                detail             = detail,
                bottomInset        = bottomInset,
                inviteQuery        = state.inviteQuery,
                inviteResults      = state.inviteResults,
                isSearchingInvite  = state.isSearchingInvite,
                inviteSentIds      = state.inviteSentIds,
                currentUserId      = currentUserId,
                onInviteQueryChange = vm::onInviteQueryChange,
                onInvite           = { vm.inviteUser(detail.id, it) },
                onExpel            = { vm.removeMember(detail.id, it) },
                onLeave            = { vm.leaveCordada(detail.id, currentUserId) },
                onDelete           = { vm.deleteCordada(detail.id) },
                onDismiss          = vm::closeDetail,
            )
        }
    }
}

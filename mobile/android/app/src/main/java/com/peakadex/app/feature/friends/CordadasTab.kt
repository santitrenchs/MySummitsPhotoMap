package com.peakadex.app.feature.friends

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import coil3.compose.AsyncImage
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.peakadex.app.R
import com.peakadex.app.core.model.CordadaDetail
import com.peakadex.app.core.model.CordadaInvite
import com.peakadex.app.core.model.CordadaMemberRanking
import com.peakadex.app.core.model.CordadaSummary
import com.peakadex.app.core.model.FriendEntry
import com.peakadex.app.core.model.UserStub
import com.peakadex.app.core.ui.levelName
import com.peakadex.app.core.ui.theme.PeakBackground
import com.peakadex.app.core.ui.theme.PeakBlueActive
import com.peakadex.app.core.ui.theme.PeakGreenCTA
import com.peakadex.app.core.ui.theme.PeakBlueLight
import com.peakadex.app.core.ui.theme.PeakClimbedGreen
import java.io.ByteArrayOutputStream

// ── Helpers ────────────────────────────────────────────────────────────────────

@Composable
private fun CordadaAvatar(name: String, size: Int = 40, avatarUrl: String? = null) {
    val initials = name.trim().split(" ").take(2)
        .mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("")
    Box(
        modifier         = Modifier
            .size(size.dp)
            .clip(CircleShape)
            .background(Brush.linearGradient(listOf(Color(0xFF059669), Color(0xFF34D399)))),
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
            Text(initials, color = Color.White, fontSize = (size * 0.36f).sp, fontWeight = FontWeight.Bold)
        }
    }
}

// NOTE: UserAvatar, SectionLabel and HRule are declared (package-visible) in
// FriendsScreen.kt and shared across this package.

// Level name/emoji come from the shared single source of truth:
// core/ui/LevelDefs.kt → levelEmoji() / levelName(). Server owns levelIdx.

// ── Cordada list card ──────────────────────────────────────────────────────────

@Composable
fun CordadaCard(item: CordadaSummary, onClick: () -> Unit) {
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFFF6FAF8))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        CordadaAvatar(item.name, 44, item.avatarUrl)
        Column(Modifier.weight(1f)) {
            Text(item.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF111827), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier          = Modifier.padding(top = 3.dp),
            ) {
                MemberAvatarStack(item.memberAvatars, item.memberCount)
                Spacer(Modifier.width(8.dp))
                Text(
                    stringResource(R.string.cordadas_members, item.memberCount),
                    fontSize = 12.sp, color = Color(0xFF9CA3AF),
                )
            }
        }
        Icon(
            imageVector        = ChevronRightIcon,
            contentDescription = null,
            tint               = Color(0xFFD1D5DB),
            modifier           = Modifier.size(18.dp),
        )
    }
}

@Composable
private fun MemberAvatarStack(avatars: List<String?>, memberCount: Int, size: Int = 22) {
    val shown   = avatars.take(4)
    val overflow = memberCount - shown.size
    val overlap = (size * 0.32f).dp
    Row {
        shown.forEachIndexed { i, url ->
            Box(
                modifier = Modifier
                    .then(if (i > 0) Modifier.offset(x = -overlap * i) else Modifier)
                    .size(size.dp)
                    .clip(CircleShape)
                    .background(Color.White)
                    .padding(1.5.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFE5E7EB)),
                contentAlignment = Alignment.Center,
            ) {
                if (!url.isNullOrBlank()) {
                    AsyncImage(
                        model              = url,
                        contentDescription = null,
                        contentScale       = ContentScale.Crop,
                        modifier           = Modifier.fillMaxSize(),
                    )
                }
            }
        }
        if (overflow > 0) {
            Box(
                modifier = Modifier
                    .offset(x = -overlap * shown.size)
                    .size(size.dp)
                    .clip(CircleShape)
                    .background(Color.White)
                    .padding(1.5.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFF3F4F6)),
                contentAlignment = Alignment.Center,
            ) {
                Text("+$overflow", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFF6B7280))
            }
        }
    }
}

// ── Invite card ────────────────────────────────────────────────────────────────

@Composable
fun InviteCard(invite: CordadaInvite, onAccept: () -> Unit, onReject: () -> Unit) {
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        CordadaAvatar(invite.name, 40, invite.avatarUrl)
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
            .background(if (ghost) Color(0xFFF3F4F6) else PeakGreenCTA)
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 6.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = if (ghost) Color(0xFF6B7280) else Color.White)
    }
}

// ── Ranking (Amigos-style rows) ──────────────────────────────────────────────────

/** Ice-axe rank badge: gold/silver/bronze piolet for top 3, plain number for the rest. */
@Composable
private fun RankBadge(rank: Int) {
    val pioletColor = when (rank) {
        1    -> Color(0xFFFBBF24)   // gold
        2    -> Color(0xFFB8C0CC)   // silver
        3    -> Color(0xFFCD7F32)   // bronze
        else -> null
    }
    Box(modifier = Modifier.width(28.dp), contentAlignment = Alignment.Center) {
        if (pioletColor != null) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    imageVector        = PioletIcon,
                    contentDescription = null,
                    tint               = pioletColor,
                    modifier           = Modifier.size(18.dp),
                )
                Text("$rank", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = pioletColor)
            }
        } else {
            Text("$rank", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = FriendsTextMuted)
        }
    }
}

@Composable
private fun CordadaRankRow(
    member: CordadaMemberRanking,
    rank: Int,
    canExpelOwner: Boolean,
    onExpel: (CordadaMemberRanking) -> Unit,
) {
    var menuOpen by remember { mutableStateOf(false) }
    val canExpel   = canExpelOwner && !member.isOwner && !member.isCurrentUser
    val valueColor = Color(0xFF374151)
    val sep        = FriendsTextMuted
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .then(if (member.isCurrentUser) Modifier.background(Color(0xFFF0F9FF)) else Modifier)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        RankBadge(rank)
        UserAvatar(member.name, 40, member.avatarUrl)
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    member.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = FriendsTextPrimary,
                    maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false),
                )
                if (member.isCurrentUser) {
                    Text("  ${stringResource(R.string.home_leaderboard_you)}", fontSize = 12.sp, color = FriendsTextSecondary)
                }
            }
            // Level (· Fundador)
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 1.dp)) {
                Text(levelName(member.levelIdx), fontSize = 12.sp, color = FriendsTextSecondary, fontWeight = FontWeight.Medium)
                if (member.isOwner) {
                    Text("  ·  ", fontSize = 12.sp, color = sep)
                    Text(stringResource(R.string.cordadas_founder), fontSize = 12.sp, color = Color(0xFF059669), fontWeight = FontWeight.SemiBold)
                }
            }
            // Stats: Cimas · [CS] N · EP
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 1.dp)) {
                Text("${member.uniquePeaks}", fontSize = 12.sp, color = valueColor, fontWeight = FontWeight.SemiBold)
                Text(" ${stringResource(R.string.home_leaderboard_col_peaks)}", fontSize = 12.sp, color = FriendsTextSecondary)
                Text("  ·  ", fontSize = 12.sp, color = sep)
                CairnIcon(Modifier.padding(end = 3.dp))
                Text("${member.totalCairns}", fontSize = 12.sp, color = Color(0xFFF59E0B), fontWeight = FontWeight.SemiBold)
                Text("  ·  ", fontSize = 12.sp, color = sep)
                Text("${member.totalEp}", fontSize = 12.sp, color = valueColor, fontWeight = FontWeight.SemiBold)
                Text(" ${stringResource(R.string.home_leaderboard_col_ep)}", fontSize = 12.sp, color = FriendsTextSecondary)
            }
        }
        if (canExpel) {
            Box {
                IconButton(onClick = { menuOpen = true }, modifier = Modifier.size(40.dp)) {
                    Text("⋮", fontSize = 18.sp, color = FriendsTextMuted)
                }
                DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                    DropdownMenuItem(
                        text    = { Text(stringResource(R.string.cordadas_expel), color = Color(0xFFEF4444), fontSize = 14.sp) },
                        onClick = { menuOpen = false; onExpel(member) },
                    )
                }
            }
        }
    }
}

// ── Pending invites (separate section) ───────────────────────────────────────────

@Composable
private fun CordadaPendingRow(member: CordadaMemberRanking, canCancel: Boolean, onCancel: (CordadaMemberRanking) -> Unit) {
    Row(
        modifier          = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        UserAvatar(member.name, 40, member.avatarUrl)
        Column(Modifier.weight(1f)) {
            Text(member.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = FriendsTextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(stringResource(R.string.cordadas_invite_sent_label), fontSize = 12.sp, color = FriendsTextMuted, modifier = Modifier.padding(top = 1.dp))
        }
        if (canCancel) {
            SmallBtn(stringResource(R.string.action_cancel), onClick = { onCancel(member) }, ghost = true)
        }
    }
}

// ── Piolet icon (ice axe) ─────────────────────────────────────────────────────────

private val PioletIcon: ImageVector by lazy {
    ImageVector.Builder("Piolet", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke          = SolidColor(Color.White),
            strokeLineWidth = 2.2f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
            strokeLineJoin  = androidx.compose.ui.graphics.StrokeJoin.Round,
        ) {
            // Shaft (diagonal)
            moveTo(15.5f, 7f); lineTo(7.5f, 20f)
            // Pick head crossing near the top
            moveTo(8f, 5.5f); lineTo(19.5f, 9f)
        }
    }.build()
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

val PlusSmallIcon: ImageVector by lazy {
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

// ── Shared sheet shell ─────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CordadaModalSheet(
    onDismiss: () -> Unit,
    dragHandle: @Composable (() -> Unit)? = { BottomSheetDefaults.DragHandle() },
    content: @Composable ColumnScope.() -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState       = sheetState,
        containerColor   = Color.White,
        dragHandle       = dragHandle,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .imePadding(),
            content = content,
        )
    }
}

// ── Create sheet ───────────────────────────────────────────────────────────────

/** Decodes [uri], center-crops to a square and scales to 512px, returns a JPEG-ready bitmap. */
private fun squareBitmapFromUri(context: android.content.Context, uri: Uri): Bitmap? = runCatching {
    val src = context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it) }
        ?: return null
    val side = minOf(src.width, src.height)
    val x = (src.width - side) / 2
    val y = (src.height - side) / 2
    val cropped = Bitmap.createBitmap(src, x, y, side, side)
    if (side > 512) Bitmap.createScaledBitmap(cropped, 512, 512, true) else cropped
}.getOrNull()

private fun bitmapToJpeg(bitmap: Bitmap): ByteArray =
    ByteArrayOutputStream().also { bitmap.compress(Bitmap.CompressFormat.JPEG, 85, it) }.toByteArray()

@Composable
fun CreateCordadaSheet(
    friends: List<FriendEntry>,
    onDismiss: () -> Unit,
    onCreate: (name: String, desc: String?, memberIds: List<String>, avatarBytes: ByteArray?) -> Unit,
) {
    val context = LocalContext.current
    var name by remember { mutableStateOf("") }
    var desc by remember { mutableStateOf("") }
    var avatarBitmap by remember { mutableStateOf<Bitmap?>(null) }
    val selectedIds = remember { mutableStateListOf<String>() }

    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { avatarBitmap = squareBitmapFromUri(context, it) }
    }

    CordadaModalSheet(onDismiss = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(stringResource(R.string.cordadas_create_title), fontSize = 17.sp, fontWeight = FontWeight.SemiBold)

            // Avatar picker (centered circle)
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Box(
                    modifier         = Modifier
                        .size(84.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFF3F4F6))
                        .border(1.dp, Color(0xFFE5E7EB), CircleShape)
                        .clickable { photoPicker.launch("image/*") },
                    contentAlignment = Alignment.Center,
                ) {
                    val bmp = avatarBitmap
                    if (bmp != null) {
                        Image(
                            bitmap        = bmp.asImageBitmap(),
                            contentDescription = null,
                            contentScale  = ContentScale.Crop,
                            modifier      = Modifier.fillMaxSize().clip(CircleShape),
                        )
                    } else {
                        Text("📷", fontSize = 26.sp)
                    }
                }
            }

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

            // Member selection (accepted friends)
            if (friends.isNotEmpty()) {
                Text(
                    stringResource(R.string.cordadas_add_members),
                    fontSize   = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color      = Color(0xFF6B7280),
                )
                Column(
                    modifier            = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 200.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    friends.forEach { entry ->
                        val checked = selectedIds.contains(entry.friend.id)
                        Row(
                            modifier          = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .clickable {
                                    if (checked) selectedIds.remove(entry.friend.id)
                                    else selectedIds.add(entry.friend.id)
                                }
                                .padding(vertical = 6.dp, horizontal = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            UserAvatar(entry.friend.name, 32, entry.friend.avatarUrl)
                            Text(
                                entry.friend.name,
                                fontSize = 14.sp,
                                color    = Color(0xFF111827),
                                modifier = Modifier.weight(1f),
                            )
                            Checkbox(checked = checked, onCheckedChange = null)
                        }
                    }
                }
            }

            Button(
                onClick  = {
                    if (name.isNotBlank()) {
                        onCreate(
                            name.trim(),
                            desc.ifBlank { null },
                            selectedIds.toList(),
                            avatarBitmap?.let { bitmapToJpeg(it) },
                        )
                    }
                },
                enabled  = name.isNotBlank(),
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors   = ButtonDefaults.buttonColors(
                    containerColor         = PeakGreenCTA,
                    contentColor           = Color.White,
                    disabledContainerColor = PeakGreenCTA.copy(alpha = 0.4f),
                    disabledContentColor   = Color.White,
                ),
            ) {
                Text(stringResource(R.string.cordadas_create_btn), fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

// ── Invite sheet ───────────────────────────────────────────────────────────────

@Composable
private fun InviteSheet(
    query: String,
    results: List<UserStub>,
    isSearching: Boolean,
    sentIds: Set<String>,
    onQueryChange: (String) -> Unit,
    onInvite: (UserStub) -> Unit,
    onDismiss: () -> Unit,
) {
    CordadaModalSheet(onDismiss = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
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
                        UserAvatar(user.name, 36, user.avatarUrl)
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
            Spacer(Modifier.height(16.dp))
        }
    }
}

// ── Detail page (full-screen) ────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CordadaDetailScreen(
    detail: CordadaDetail,
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
    onEditImage: (ByteArray) -> Unit,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    var showInviteSheet   by remember { mutableStateOf(false) }
    var showConfirmLeave  by remember { mutableStateOf(false) }
    var showConfirmDelete by remember { mutableStateOf(false) }
    var expelTarget       by remember { mutableStateOf<CordadaMemberRanking?>(null) }

    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { u ->
            squareBitmapFromUri(context, u)?.let { bmp -> onEditImage(bitmapToJpeg(bmp)) }
        }
    }

    val accepted = detail.members.filter { !it.isPending }
    val pending  = detail.members.filter { it.isPending }

    Surface(modifier = Modifier.fillMaxSize(), color = PeakBackground) {
        Scaffold(
            topBar = {
                CenterAlignedTopAppBar(
                    title          = { Text(detail.name, fontSize = 17.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(BackChevronIcon, contentDescription = "Volver", tint = Color.Unspecified)
                        }
                    },
                    actions = {
                        if (detail.isOwner) {
                            TextButton(onClick = { showInviteSheet = true }) {
                                Text(stringResource(R.string.cordadas_invite_btn), color = PeakBlueActive, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Color.White),
                )
            },
            containerColor = PeakBackground,
        ) { padding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState()),
            ) {
                // Cover image (editable) — the only identifying visual
                Box(modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f)) {
                    if (!detail.avatarUrl.isNullOrBlank()) {
                        AsyncImage(
                            model              = detail.avatarUrl,
                            contentDescription = detail.name,
                            contentScale       = ContentScale.Crop,
                            modifier           = Modifier.fillMaxSize(),
                        )
                    } else {
                        Box(
                            modifier         = Modifier
                                .fillMaxSize()
                                .background(Brush.linearGradient(listOf(Color(0xFF059669), Color(0xFF34D399)))),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text("⛰", fontSize = 48.sp)
                        }
                    }
                    if (detail.isOwner) {
                        SmallFloatingActionButton(
                            onClick        = { photoPicker.launch("image/*") },
                            containerColor = Color.White,
                            contentColor   = PeakBlueActive,
                            modifier       = Modifier
                                .align(Alignment.BottomEnd)
                                .padding(12.dp),
                        ) {
                            Icon(EditPencilIcon, contentDescription = stringResource(R.string.cordadas_edit_photo), modifier = Modifier.size(20.dp))
                        }
                    }
                }

                // Name + member count
                Column(modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 4.dp)) {
                    Text(detail.name, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = FriendsTextPrimary)
                    if (!detail.description.isNullOrBlank()) {
                        Spacer(Modifier.height(4.dp))
                        Text(detail.description, fontSize = 13.sp, color = FriendsTextSecondary)
                    }
                    Spacer(Modifier.height(6.dp))
                    Text("👥 ${stringResource(R.string.cordadas_members, accepted.size)}", fontSize = 13.sp, color = FriendsTextMuted)
                }

                Spacer(Modifier.height(12.dp))

                // Ranking (Amigos-style)
                SectionLabel(stringResource(R.string.cordadas_ranking))
                accepted.forEachIndexed { index, member ->
                    CordadaRankRow(
                        member        = member,
                        rank          = index + 1,
                        canExpelOwner = detail.isOwner,
                        onExpel       = { expelTarget = it },
                    )
                }

                // Pending invites (separate section)
                if (pending.isNotEmpty()) {
                    Spacer(Modifier.height(12.dp))
                    SectionLabel(stringResource(R.string.cordadas_invites_section))
                    pending.forEach { member ->
                        CordadaPendingRow(member, canCancel = detail.isOwner, onCancel = { expelTarget = it })
                    }
                }

                Spacer(Modifier.height(24.dp))

                // Footer action
                if (detail.isOwner) {
                    TextButton(
                        onClick  = { showConfirmDelete = true },
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                        colors   = ButtonDefaults.textButtonColors(contentColor = Color(0xFFEF4444)),
                    ) { Text(stringResource(R.string.cordadas_delete), fontWeight = FontWeight.SemiBold) }
                } else {
                    TextButton(
                        onClick  = { showConfirmLeave = true },
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                        colors   = ButtonDefaults.textButtonColors(contentColor = Color(0xFFEF4444)),
                    ) { Text(stringResource(R.string.cordadas_leave), fontWeight = FontWeight.SemiBold) }
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }

    // Invite sheet
    if (showInviteSheet) {
        InviteSheet(
            query         = inviteQuery,
            results       = inviteResults,
            isSearching   = isSearchingInvite,
            sentIds       = inviteSentIds,
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

// ── Cordada detail host (rendered by the unified FriendsScreen) ──────────────────

@Composable
fun CordadaDetailHost(currentUserId: String, vm: CordadasViewModel) {
    val state by vm.state.collectAsStateWithLifecycle()
    val detail = state.selectedDetail
    if (state.isLoadingDetail) {
        Box(
            Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.3f)),
            contentAlignment = Alignment.Center,
        ) {
            CircularProgressIndicator(color = Color.White)
        }
    } else if (detail != null) {
        CordadaDetailScreen(
            detail              = detail,
            inviteQuery         = state.inviteQuery,
            inviteResults       = state.inviteResults,
            isSearchingInvite   = state.isSearchingInvite,
            inviteSentIds       = state.inviteSentIds,
            currentUserId       = currentUserId,
            onInviteQueryChange = vm::onInviteQueryChange,
            onInvite            = { vm.inviteUser(detail.id, it) },
            onExpel             = { vm.removeMember(detail.id, it) },
            onLeave             = { vm.leaveCordada(detail.id, currentUserId) },
            onDelete            = { vm.deleteCordada(detail.id) },
            onEditImage         = { vm.updateCordadaAvatar(detail.id, it) },
            onBack              = vm::closeDetail,
        )
    }
}

private val EditPencilIcon: ImageVector by lazy {
    ImageVector.Builder("EditPencil", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke          = SolidColor(Color(0xFF374151)),
            strokeLineWidth = 2f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
            strokeLineJoin  = androidx.compose.ui.graphics.StrokeJoin.Round,
        ) {
            moveTo(12f, 20f); lineTo(21f, 20f)
            moveTo(16.5f, 3.5f)
            curveTo(16.9f, 3.1f, 17.4f, 2.9f, 18f, 2.9f)
            curveTo(18.6f, 2.9f, 19.1f, 3.1f, 19.5f, 3.5f)
            curveTo(19.9f, 3.9f, 20.1f, 4.4f, 20.1f, 5f)
            curveTo(20.1f, 5.6f, 19.9f, 6.1f, 19.5f, 6.5f)
            lineTo(7f, 19f); lineTo(3f, 20f); lineTo(4f, 16f)
            close()
        }
    }.build()
}

private val BackChevronIcon: ImageVector by lazy {
    ImageVector.Builder("Back", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF374151)),
            strokeLineWidth = 2f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
            strokeLineJoin  = androidx.compose.ui.graphics.StrokeJoin.Round,
        ) { moveTo(15f, 18f); lineTo(9f, 12f); lineTo(15f, 6f) }
    }.build()
}

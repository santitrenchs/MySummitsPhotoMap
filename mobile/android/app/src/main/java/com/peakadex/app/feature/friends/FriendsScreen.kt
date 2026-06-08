package com.peakadex.app.feature.friends

import android.content.ContentResolver
import android.content.Intent
import android.net.Uri
import android.provider.ContactsContract
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
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
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.LifecycleResumeEffect
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
internal val FriendsDanger        = Color(0xFFEF4444)
internal val FriendsAccept        = Color(0xFF16A34A)
internal val FriendsAcceptBg      = Color(0xFFDCFCE7)

// Shared list metrics — every main-list row aligns to these so the inset
// divider lines up under the text (avatar 48 + start pad 16 + gap 12 = 76).
internal val ListRowAvatar = 48
internal val ListRowInset  = 76

@Composable
internal fun InsetRule() = HorizontalDivider(
    color     = FriendsDivider,
    thickness = 1.dp,
    modifier  = Modifier.padding(start = ListRowInset.dp),
)

// ── Row action button (Material, ≥40dp touch height) ─────────────────────────────

@Composable
internal fun RowActionButton(label: String, onClick: () -> Unit, primary: Boolean) {
    if (primary) {
        FilledTonalButton(
            onClick        = onClick,
            shape          = RoundedCornerShape(10.dp),
            colors         = ButtonDefaults.filledTonalButtonColors(
                containerColor = FriendsAcceptBg,
                contentColor   = FriendsAccept,
            ),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            modifier       = Modifier.heightIn(min = 40.dp),
        ) {
            Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    } else {
        OutlinedButton(
            onClick        = onClick,
            shape          = RoundedCornerShape(10.dp),
            border         = BorderStroke(1.dp, Color(0xFFE5E7EB)),
            colors         = ButtonDefaults.outlinedButtonColors(contentColor = FriendsTextSecondary),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            modifier       = Modifier.heightIn(min = 40.dp),
        ) {
            Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

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

private val PersonAddIcon: ImageVector by lazy {
    ImageVector.Builder("PersonAdd", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF374151)),
            strokeLineWidth = 2f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
            strokeLineJoin  = androidx.compose.ui.graphics.StrokeJoin.Round,
        ) {
            // Head
            moveTo(13f, 7f)
            curveTo(13f, 9.21f, 11.21f, 11f, 9f, 11f)
            curveTo(6.79f, 11f, 5f, 9.21f, 5f, 7f)
            curveTo(5f, 4.79f, 6.79f, 3f, 9f, 3f)
            curveTo(11.21f, 3f, 13f, 4.79f, 13f, 7f)
            close()
            // Shoulders
            moveTo(1f, 21f)
            curveTo(1f, 17f, 4.58f, 14f, 9f, 14f)
            curveTo(11f, 14f, 12.83f, 14.61f, 14.24f, 15.63f)
            // Plus
            moveTo(19f, 8f); lineTo(19f, 14f)
            moveTo(16f, 11f); lineTo(22f, 11f)
        }
    }.build()
}

/** Two connected rope nodes — "create cordada". */
private val RopeTeamIcon: ImageVector by lazy {
    ImageVector.Builder("RopeTeam", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color(0xFF374151)),
            strokeLineWidth = 2f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
            strokeLineJoin  = androidx.compose.ui.graphics.StrokeJoin.Round,
        ) {
            // First climber / anchor node
            moveTo(8.5f, 8f)
            curveTo(8.5f, 9.66f, 7.16f, 11f, 5.5f, 11f)
            curveTo(3.84f, 11f, 2.5f, 9.66f, 2.5f, 8f)
            curveTo(2.5f, 6.34f, 3.84f, 5f, 5.5f, 5f)
            curveTo(7.16f, 5f, 8.5f, 6.34f, 8.5f, 8f)
            close()
            // Second climber / anchor node
            moveTo(21.5f, 16f)
            curveTo(21.5f, 17.66f, 20.16f, 19f, 18.5f, 19f)
            curveTo(16.84f, 19f, 15.5f, 17.66f, 15.5f, 16f)
            curveTo(15.5f, 14.34f, 16.84f, 13f, 18.5f, 13f)
            curveTo(20.16f, 13f, 21.5f, 14.34f, 21.5f, 16f)
            close()
            // Rope
            moveTo(8.35f, 9.7f)
            curveTo(11.2f, 10.7f, 13.45f, 12.1f, 15.65f, 14.25f)
            moveTo(8f, 13.8f)
            curveTo(10.95f, 12.65f, 13.35f, 11.6f, 16.2f, 10.2f)
        }
    }.build()
}

/** Cairn (CS) icon — three stacked amber trapezoids, identical to the Stats hero. */
@Composable
internal fun CairnIcon(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier.size(width = 11.dp, height = 10.dp)) {
        val w = size.width; val h = size.height
        val amber = Color(0xFFF59E0B)
        drawPath(Path().apply { moveTo(w*0.05f,h); lineTo(w*0.95f,h); lineTo(w*0.82f,h*0.72f); lineTo(w*0.18f,h*0.72f); close() }, color = amber)
        drawPath(Path().apply { moveTo(w*0.18f,h*0.68f); lineTo(w*0.82f,h*0.68f); lineTo(w*0.70f,h*0.40f); lineTo(w*0.30f,h*0.40f); close() }, color = amber)
        drawPath(Path().apply { moveTo(w*0.30f,h*0.36f); lineTo(w*0.70f,h*0.36f); lineTo(w*0.58f,h*0.04f); lineTo(w*0.42f,h*0.04f); close() }, color = amber)
    }
}

/** Standard Material `more_vert` (three dots). */
private val MoreVertIcon: ImageVector by lazy {
    ImageVector.Builder("MoreVert", 24.dp, 24.dp, 24f, 24f).apply {
        path(fill = androidx.compose.ui.graphics.SolidColor(Color(0xFF9CA3AF))) {
            // top dot
            moveTo(12f, 8f)
            curveTo(13.1f, 8f, 14f, 7.1f, 14f, 6f)
            curveTo(14f, 4.9f, 13.1f, 4f, 12f, 4f)
            curveTo(10.9f, 4f, 10f, 4.9f, 10f, 6f)
            curveTo(10f, 7.1f, 10.9f, 8f, 12f, 8f)
            close()
            // middle dot
            moveTo(12f, 10f)
            curveTo(10.9f, 10f, 10f, 10.9f, 10f, 12f)
            curveTo(10f, 13.1f, 10.9f, 14f, 12f, 14f)
            curveTo(13.1f, 14f, 14f, 13.1f, 14f, 12f)
            curveTo(14f, 10.9f, 13.1f, 10f, 12f, 10f)
            close()
            // bottom dot
            moveTo(12f, 16f)
            curveTo(10.9f, 16f, 10f, 16.9f, 10f, 18f)
            curveTo(10f, 19.1f, 10.9f, 20f, 12f, 20f)
            curveTo(13.1f, 20f, 14f, 19.1f, 14f, 18f)
            curveTo(14f, 16.9f, 13.1f, 16f, 12f, 16f)
            close()
        }
    }.build()
}

/** Crown icon — small gold/amber founder marker. */
internal val CrownIcon: ImageVector by lazy {
    ImageVector.Builder("Crown", 24.dp, 24.dp, 24f, 24f).apply {
        path(fill = androidx.compose.ui.graphics.SolidColor(Color(0xFFF59E0B))) {
            moveTo(3f, 7f)
            lineTo(6.5f, 11f)
            lineTo(12f, 4.5f)
            lineTo(17.5f, 11f)
            lineTo(21f, 7f)
            lineTo(19f, 19f)
            lineTo(5f, 19f)
            close()
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
            FriendshipStatus.NONE             -> RowActionButton(stringResource(R.string.friends_add), onAdd, primary = true)
            FriendshipStatus.PENDING_SENT     ->
                Text(stringResource(R.string.friends_request_sent), fontSize = 12.sp, color = FriendsTextMuted, fontWeight = FontWeight.SemiBold)
            FriendshipStatus.PENDING_RECEIVED -> RowActionButton(stringResource(R.string.friends_accept), onAccept, primary = true)
            FriendshipStatus.ACCEPTED         ->
                Text("✓ ${stringResource(R.string.friends_already_friends)}", fontSize = 12.sp, color = FriendsAccept, fontWeight = FontWeight.SemiBold)
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
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            RowActionButton(stringResource(R.string.friends_accept), onAccept, primary = true)
            RowActionButton(stringResource(R.string.friends_reject), onReject, primary = false)
        }
    }
}

@Composable
private fun FriendRow(entry: FriendEntry, onRemove: () -> Unit) {
    var menuOpen by remember { mutableStateOf(false) }
    var confirmRemove by remember { mutableStateOf(false) }

    if (confirmRemove) {
        AlertDialog(
            onDismissRequest = { confirmRemove = false },
            title   = { Text(stringResource(R.string.friends_remove)) },
            text    = { Text(stringResource(R.string.friends_confirm_remove, entry.friend.name)) },
            confirmButton = {
                TextButton(onClick = { confirmRemove = false; onRemove() }) {
                    Text(stringResource(R.string.friends_remove), color = FriendsDanger)
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmRemove = false }) {
                    Text(stringResource(R.string.action_cancel))
                }
            },
        )
    }
    val valueColor = Color(0xFF374151)
    val sep        = FriendsTextMuted
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        UserAvatar(entry.friend.name, ListRowAvatar, entry.friend.avatarUrl)
        Column(Modifier.weight(1f)) {
            Text(entry.friend.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = FriendsTextPrimary)
            // Secondary line: level · N Cimas · N EP · [CS] N
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(top = 1.dp),
            ) {
                Text(levelName(entry.friend.levelIdx), fontSize = 12.sp, color = FriendsTextSecondary, fontWeight = FontWeight.Medium)
                Text("  ·  ", fontSize = 12.sp, color = sep)
                Text("${entry.friend.uniquePeaks}", fontSize = 12.sp, color = valueColor, fontWeight = FontWeight.SemiBold)
                Text(" ${stringResource(R.string.home_leaderboard_col_peaks)}", fontSize = 12.sp, color = FriendsTextSecondary)
                Text("  ·  ", fontSize = 12.sp, color = sep)
                CairnIcon(Modifier.padding(end = 3.dp))
                Text("${entry.friend.totalCairns}", fontSize = 12.sp, color = Color(0xFFF59E0B), fontWeight = FontWeight.SemiBold)
                Text("  ·  ", fontSize = 12.sp, color = sep)
                Text("${entry.friend.totalEp}", fontSize = 12.sp, color = valueColor, fontWeight = FontWeight.SemiBold)
                Text(" ${stringResource(R.string.home_leaderboard_col_ep)}", fontSize = 12.sp, color = FriendsTextSecondary)
            }
        }
        Box {
            IconButton(onClick = { menuOpen = true }, modifier = Modifier.size(48.dp)) {
                Icon(MoreVertIcon, contentDescription = stringResource(R.string.friends_remove), tint = Color.Unspecified, modifier = Modifier.size(20.dp))
            }
            DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                DropdownMenuItem(
                    text    = { Text(stringResource(R.string.friends_remove), color = FriendsDanger, fontSize = 14.sp) },
                    onClick = { menuOpen = false; confirmRemove = true },
                )
            }
        }
    }
}

// ── Invite friend sheet ──────────────────────────────────────────────────────────

private data class ContactInviteCandidate(
    val name: String,
    val email: String?,
    val phone: String?,
)

private fun readContactInviteCandidate(resolver: ContentResolver, uri: Uri): ContactInviteCandidate? {
    val contactProjection = arrayOf(
        ContactsContract.Contacts.DISPLAY_NAME_PRIMARY,
    )
    return runCatching {
        resolver.query(uri, contactProjection, null, null, null)?.use { cursor ->
            if (!cursor.moveToFirst()) return@runCatching null
            val name = cursor.getString(cursor.getColumnIndexOrThrow(ContactsContract.Contacts.DISPLAY_NAME_PRIMARY))
                ?: return@runCatching null

            var email: String? = null
            var phone: String? = null
            val entityUri = Uri.withAppendedPath(uri, ContactsContract.Contacts.Entity.CONTENT_DIRECTORY)
            runCatching {
                resolver.query(
                    entityUri,
                    arrayOf(ContactsContract.Data.MIMETYPE, ContactsContract.Data.DATA1),
                    null,
                    null,
                    null,
                )?.use { rows ->
                    val mimeIndex = rows.getColumnIndexOrThrow(ContactsContract.Data.MIMETYPE)
                    val dataIndex = rows.getColumnIndexOrThrow(ContactsContract.Data.DATA1)
                    while (rows.moveToNext() && (email == null || phone == null)) {
                        when (rows.getString(mimeIndex)) {
                            ContactsContract.CommonDataKinds.Email.CONTENT_ITEM_TYPE ->
                                if (email == null) email = rows.getString(dataIndex)
                            ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE ->
                                if (phone == null) phone = rows.getString(dataIndex)
                        }
                    }
                }
            }

            ContactInviteCandidate(name = name, email = email, phone = phone)
        }
    }.getOrNull()
}

@Composable
private fun InviteFriendSheet(
    inviteState: InviteState,
    onDismiss: () -> Unit,
    onResolve: (String?) -> Unit,
    onSendEmail: (String) -> Unit,
) {
    val context = LocalContext.current
    var manualEmail by remember { mutableStateOf("") }
    var selectedContact by remember { mutableStateOf<ContactInviteCandidate?>(null) }
    val candidateEmail = selectedContact?.email ?: manualEmail.trim().takeIf { it.contains("@") && it.contains(".") }
    val candidatePhone = selectedContact?.phone
    val valid = candidateEmail != null
    val sending = inviteState == InviteState.SENDING
    val resolving = inviteState == InviteState.RESOLVING
    val isSuccess = inviteState == InviteState.INVITED || inviteState == InviteState.FRIEND_REQUEST_SENT

    val contactPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickContact()) { uri ->
        if (uri != null) {
            val contact = readContactInviteCandidate(context.contentResolver, uri)
            selectedContact = contact
            manualEmail = contact?.email.orEmpty()
            onResolve(contact?.email)
        }
    }

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

            InviteContactPickerRow(
                selectedContact = selectedContact,
                enabled = !sending && !resolving && !isSuccess,
                onClick = { contactPicker.launch(null) },
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                HorizontalDivider(color = FriendsDivider, modifier = Modifier.weight(1f))
                Text(stringResource(R.string.friends_invite_or), fontSize = 12.sp, color = FriendsTextMuted, fontWeight = FontWeight.SemiBold)
                HorizontalDivider(color = FriendsDivider, modifier = Modifier.weight(1f))
            }

            OutlinedTextField(
                value         = manualEmail,
                onValueChange = { manualEmail = it; selectedContact = null },
                label         = { Text(stringResource(R.string.friends_invite_email_hint)) },
                singleLine    = true,
                enabled       = !sending && !resolving && !isSuccess,
                modifier      = Modifier.fillMaxWidth(),
            )

            // Status feedback
            val feedback: Pair<String, Color>? = when (inviteState) {
                InviteState.CONTACT_NOT_REGISTERED -> stringResource(R.string.friends_invite_not_registered) to FriendsTextSecondary
                InviteState.INVITED            -> stringResource(R.string.friends_invite_ok) to Color(0xFF15803D)
                InviteState.FRIEND_REQUEST_SENT -> stringResource(R.string.friends_invite_request_ok) to Color(0xFF15803D)
                InviteState.ALREADY_FRIENDS     -> stringResource(R.string.friends_invite_already_friends) to FriendsTextSecondary
                InviteState.REQUEST_PENDING     -> stringResource(R.string.friends_invite_request_pending) to FriendsTextSecondary
                InviteState.ALREADY_REGISTERED -> stringResource(R.string.friends_invite_already_registered) to FriendsTextSecondary
                InviteState.CANNOT_INVITE_SELF -> stringResource(R.string.friends_invite_self) to Color(0xFFDC2626)
                InviteState.ERROR              -> stringResource(R.string.friends_invite_error) to Color(0xFFDC2626)
                else                           -> null
            }
            feedback?.let { (msg, color) ->
                Text(msg, fontSize = 13.sp, color = color, fontWeight = FontWeight.Medium)
            }

            if (inviteState == InviteState.CONTACT_NO_DATA && selectedContact != null) {
                InviteNoContactDataCard(
                    onManualEmail = {
                        selectedContact = null
                        manualEmail = ""
                    },
                )
            } else if (inviteState == InviteState.CONTACT_NOT_REGISTERED) {
                InviteChannelChoices(
                    email = candidateEmail,
                    phone = candidatePhone,
                    sending = sending,
                    onEmail = { email -> onSendEmail(email) },
                    onWhatsApp = {
                        val message = context.getString(R.string.friends_invite_whatsapp_message)
                        val intent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, message)
                            setPackage("com.whatsapp")
                        }
                        runCatching { context.startActivity(intent) }
                            .onFailure {
                                context.startActivity(Intent.createChooser(
                                    Intent(Intent.ACTION_SEND).apply {
                                        type = "text/plain"
                                        putExtra(Intent.EXTRA_TEXT, message)
                                    },
                                    context.getString(R.string.friends_invite_whatsapp),
                                ))
                            }
                    },
                )
            } else {
                Button(
                    onClick  = { if (valid && !sending && !resolving) onResolve(candidateEmail) },
                    enabled  = valid && !sending && !resolving && !isSuccess,
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    colors   = ButtonDefaults.buttonColors(containerColor = PeakGreenCTA),
                ) {
                    if (sending || resolving) {
                        CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                    } else {
                        Text(stringResource(R.string.friends_invite_continue_btn), fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
private fun InviteContactPickerRow(
    selectedContact: ContactInviteCandidate?,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFFF8FAFC))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .size(42.dp)
                .clip(CircleShape)
                .background(Color(0xFFEFF6FF)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(PersonAddIcon, contentDescription = null, tint = PeakBlueActive, modifier = Modifier.size(22.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(
                selectedContact?.name ?: stringResource(R.string.friends_invite_choose_contact),
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = FriendsTextPrimary,
                maxLines = 1,
            )
            Text(
                selectedContact?.email ?: selectedContact?.phone
                    ?: if (selectedContact != null) stringResource(R.string.friends_invite_no_contact_data_title)
                    else stringResource(R.string.friends_invite_choose_contact_subtitle),
                fontSize = 12.sp,
                color = FriendsTextSecondary,
                maxLines = 1,
            )
        }
        Text("›", fontSize = 24.sp, color = FriendsTextMuted)
    }
}

@Composable
private fun InviteNoContactDataCard(onManualEmail: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFFF8FAFC))
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(
            modifier = Modifier
                .size(42.dp)
                .clip(CircleShape)
                .background(Color(0xFFEFF6FF)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(PersonAddIcon, contentDescription = null, tint = PeakBlueActive, modifier = Modifier.size(22.dp))
        }
        Text(
            stringResource(R.string.friends_invite_no_contact_data_title),
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = FriendsTextPrimary,
        )
        Text(
            stringResource(R.string.friends_invite_no_contact_data_body),
            fontSize = 12.sp,
            color = FriendsTextSecondary,
            textAlign = TextAlign.Center,
            lineHeight = 17.sp,
        )
        TextButton(onClick = onManualEmail) {
            Text(stringResource(R.string.friends_invite_write_email), fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun InviteChannelChoices(
    email: String?,
    phone: String?,
    sending: Boolean,
    onEmail: (String) -> Unit,
    onWhatsApp: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(stringResource(R.string.friends_invite_channel_title), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = FriendsTextPrimary)
        if (phone != null) {
            InviteChannelRow(
                title = stringResource(R.string.friends_invite_whatsapp),
                subtitle = stringResource(R.string.friends_invite_whatsapp_subtitle),
                icon = RopeTeamIcon,
                enabled = !sending,
                onClick = onWhatsApp,
            )
        }
        if (email != null) {
            InviteChannelRow(
                title = stringResource(R.string.friends_invite_email_channel),
                subtitle = email,
                icon = PersonAddIcon,
                enabled = !sending,
                onClick = { onEmail(email) },
            )
        }
    }
}

@Composable
private fun InviteChannelRow(
    title: String,
    subtitle: String,
    icon: ImageVector,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color.White)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .size(38.dp)
                .clip(CircleShape)
                .background(Color(0xFFEFF6FF)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = PeakBlueActive, modifier = Modifier.size(20.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = FriendsTextPrimary)
            Text(subtitle, fontSize = 12.sp, color = FriendsTextSecondary, maxLines = 1)
        }
        Text("›", fontSize = 22.sp, color = FriendsTextMuted)
    }
}

// ── FAB speed-dial sheet (invite friend / create cordada) ────────────────────────

@Composable
private fun ActionSpeedDialSheet(
    onDismiss: () -> Unit,
    onInviteFriend: () -> Unit,
    onCreateCordada: () -> Unit,
) {
    CordadaModalSheet(onDismiss = onDismiss) {
        Column(
            modifier            = Modifier.fillMaxWidth().padding(bottom = 8.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            SpeedDialRow(
                icon  = PersonAddIcon,
                label = stringResource(R.string.friends_action_invite),
                onClick = onInviteFriend,
            )
            SpeedDialRow(
                icon  = RopeTeamIcon,
                label = stringResource(R.string.friends_action_create_cordada),
                onClick = onCreateCordada,
            )
        }
    }
}

@Composable
private fun SpeedDialRow(icon: ImageVector, label: String, onClick: () -> Unit) {
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Box(
            modifier         = Modifier.size(40.dp).clip(CircleShape).background(Color(0xFFEFF6FF)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = PeakBlueActive, modifier = Modifier.size(22.dp))
        }
        Text(label, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = FriendsTextPrimary)
    }
}

private val PlusIcon: ImageVector by lazy {
    ImageVector.Builder("Plus", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color.White),
            strokeLineWidth = 2.5f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
        ) { moveTo(12f, 5f); lineTo(12f, 19f) }
        path(
            stroke          = androidx.compose.ui.graphics.SolidColor(Color.White),
            strokeLineWidth = 2.5f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
        ) { moveTo(5f, 12f); lineTo(19f, 12f) }
    }.build()
}

// ── Screen ─────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendsScreen(
    onOpenCordada: (String) -> Unit = {},
    autoOpenInvite: Boolean = false,
    onAutoOpenInviteConsumed: () -> Unit = {},
    friendsVm: FriendsViewModel = viewModel(),
    cordadasVm: CordadasViewModel = viewModel(),
) {
    val friendsState by friendsVm.state.collectAsStateWithLifecycle()
    val cordadasState by cordadasVm.state.collectAsStateWithLifecycle()

    var showCreateSheet by remember { mutableStateOf(false) }
    var showInviteFriendSheet by remember { mutableStateOf(false) }
    var showActionSheet by remember { mutableStateOf(false) }

    // Auto-open invite sheet when triggered from another screen (e.g. SoloRankingSection CTA)
    LaunchedEffect(autoOpenInvite) {
        if (autoOpenInvite) {
            showInviteFriendSheet = true
            onAutoOpenInviteConsumed()
        }
    }

    val snackbarHostState = remember { SnackbarHostState() }
    val genericError = stringResource(R.string.friends_generic_error)
    val createError = stringResource(R.string.cordadas_create_error)
    val avatarUploadError = stringResource(R.string.cordadas_avatar_upload_error)

    LaunchedEffect(cordadasState.error) {
        cordadasState.error?.let { error ->
            snackbarHostState.showSnackbar(if (error == "avatar_upload_failed") avatarUploadError else createError)
            cordadasVm.clearError()
        }
    }
    LaunchedEffect(friendsState.error) {
        if (!friendsState.isLoading && friendsState.error != null) {
            snackbarHostState.showSnackbar(genericError)
        }
    }

    // Refresh the cordadas list when returning from the full-screen detail
    // Reload on every resume — covers returning from CordadaDetail (outer nav) and
    // switching back from another tab. The ViewModel's init already loads on first
    // creation, so the extra call here is a fast no-op in most cases (Retrofit
    // doesn't block the UI). This is the most reliable way to keep the list fresh
    // after leave / expel / delete without cross-VM signalling.
    LifecycleResumeEffect(Unit) {
        cordadasVm.load()
        onPauseOrDispose { }
    }

    Scaffold(
        // This Scaffold is nested inside MainScaffold, which already consumes the
        // status-bar inset. Zero the insets here so we don't double-pad (white gap).
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            FloatingActionButton(
                onClick        = { showActionSheet = true },
                containerColor = PeakGreenCTA,
                contentColor   = Color.White,
                shape          = CircleShape,
                elevation      = FloatingActionButtonDefaults.elevation(
                    defaultElevation = 4.dp,
                    pressedElevation = 8.dp,
                ),
            ) {
                Icon(PlusIcon, contentDescription = stringResource(R.string.friends_fab_add), modifier = Modifier.size(24.dp))
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
                    onOpenCordada = onOpenCordada,
                )
            }
        }
    }

    // FAB speed-dial: invite a friend OR create a cordada
    if (showActionSheet) {
        ActionSpeedDialSheet(
            onDismiss        = { showActionSheet = false },
            onInviteFriend   = { showActionSheet = false; showInviteFriendSheet = true },
            onCreateCordada  = { showActionSheet = false; showCreateSheet = true },
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
            onResolve   = { email -> friendsVm.resolveInvitation(email) },
            onSendEmail = { email -> friendsVm.inviteFriendByEmail(email) },
        )
    }

    // Create cordada
    if (showCreateSheet) {
        CreateCordadaSheet(
            friends    = friendsState.friends,
            isCreating = cordadasState.isCreating,
            onDismiss = { showCreateSheet = false },
            onCreate  = { name, desc, memberIds, avatarBytes ->
                cordadasVm.createCordada(name, desc, memberIds, avatarBytes) { cordadaId ->
                    showCreateSheet = false
                    onOpenCordada(cordadaId)
                }
            },
        )
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

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun UnifiedList(
    friendsState: FriendsUiState,
    cordadasState: CordadasUiState,
    friendsVm: FriendsViewModel,
    cordadasVm: CordadasViewModel,
    onOpenCordada: (String) -> Unit,
) {
    LazyColumn(
        modifier       = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 96.dp),
    ) {
        // ── Search — pinned so it stays reachable while scrolling ──
        stickyHeader {
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
                        CordadaCard(item = item) { onOpenCordada(item.id) }
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
            item {
                SectionLabel(
                    "${stringResource(R.string.friends_section_friends)} ${friendsState.friends.size}" +
                        "   ·   ${stringResource(R.string.cordadas_tab)} ${cordadasState.cordadas.size}"
                )
            }
            itemsIndexed(chats, key = { _, it -> it.key }) { index, chat ->
                Column(Modifier.animateItem().background(Color.White)) {
                    when (chat) {
                        is ChatEntry.Friend -> FriendRow(
                            entry    = chat.entry,
                            onRemove = { friendsVm.removeFriend(chat.entry.id) },
                        )
                        is ChatEntry.Group -> CordadaCard(item = chat.cordada) {
                            onOpenCordada(chat.cordada.id)
                        }
                    }
                    // Inset divider between rows (aligned under the text), none after the last.
                    if (index < chats.lastIndex) InsetRule()
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
                        Icon(RopeTeamIcon, contentDescription = null, tint = PeakBlueActive, modifier = Modifier.size(34.dp))
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

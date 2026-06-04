package com.peakadex.app.feature.friends

import android.graphics.Bitmap
import android.graphics.Color as AndroidColor
import android.net.Uri
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.layout.ContentScale
import coil3.compose.AsyncImage
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.canhub.cropper.CropImageOptions
import com.canhub.cropper.CropImageView
import com.peakadex.app.AppContainer
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

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
    // Flat list row — same metrics as FriendRow (avatar 48 + 16/8 padding) so
    // friends and cordadas read as one unified list. The group is distinguished
    // by the cordada avatar + member-avatar stack, not a different background.
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        CordadaAvatar(item.name, ListRowAvatar, item.avatarUrl)
        Column(Modifier.weight(1f)) {
            Text(item.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = FriendsTextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier          = Modifier.padding(top = 3.dp),
            ) {
                MemberAvatarStack(item.memberAvatars, item.memberCount)
                Spacer(Modifier.width(8.dp))
                Text(
                    cordadaMembersLabel(item.memberCount),
                    fontSize = 12.sp, color = FriendsTextSecondary,
                )
            }
        }
        Icon(
            imageVector        = ChevronRightIcon,
            contentDescription = null,
            tint               = FriendsTextMuted,
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
            Text(invite.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = FriendsTextPrimary)
            Text(
                stringResource(R.string.cordadas_invite_from, invite.ownerName),
                fontSize = 12.sp, color = FriendsTextMuted,
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            RowActionButton(stringResource(R.string.friends_accept), onAccept, primary = true)
            RowActionButton(stringResource(R.string.friends_reject), onReject, primary = false)
        }
    }
}

// ── Ranking (Amigos-style rows) ──────────────────────────────────────────────────

/** Ice-axe rank badge: colored pill with piolet for top 3, number-only pill for the rest. */
@Composable
private fun RankBadge(rank: Int) {
    // bg = soft fill, content = darker accent (icon + number)
    val (bg, content) = when (rank) {
        1    -> Color(0xFFFDE68A) to Color(0xFFD97706)   // gold
        2    -> Color(0xFFE5E7EB) to Color(0xFF6B7280)   // silver
        3    -> Color(0xFFF8D9B8) to Color(0xFFB45309)   // bronze
        else -> Color(0xFFF3F4F6) to Color(0xFF6B7280)   // plain
    }
    Box(
        modifier = Modifier
            .size(width = 30.dp, height = 44.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(bg),
        contentAlignment = Alignment.Center,
    ) {
        if (rank <= 3) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    imageVector        = PioletIcon,
                    contentDescription = null,
                    tint               = content,
                    modifier           = Modifier.size(18.dp),
                )
                Text("$rank", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = content)
            }
        } else {
            Text("$rank", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = content)
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
        UserAvatar(member.name, 52, member.avatarUrl)
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
            OutlinedButton(
                onClick      = { onCancel(member) },
                shape        = RoundedCornerShape(8.dp),
                border       = BorderStroke(1.dp, PeakGreenCTA),
                colors       = ButtonDefaults.outlinedButtonColors(contentColor = PeakGreenCTA),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                modifier     = Modifier.heightIn(min = 40.dp),
            ) {
                Text(stringResource(R.string.action_cancel), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun cordadaMembersLabel(count: Int): String =
    if (count == 1) stringResource(R.string.cordadas_member_singular)
    else stringResource(R.string.cordadas_members, count)

// ── Add-member button ────────────────────────────────────────────────────────────

@Composable
private fun AddMemberButton(onClick: () -> Unit) {
    val borderColor = Color(0xFFCBD5E1)
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(CircleShape)
            .background(Color.White.copy(alpha = 0.74f))
            .drawBehind {
                drawCircle(
                    color = borderColor,
                    style = Stroke(
                        width = 1.5.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(7f, 5f), 0f),
                    ),
                )
            }
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            PlusSmallIcon,
            contentDescription = stringResource(R.string.cordadas_invite_btn),
            tint = PeakBlueActive,
            modifier = Modifier.size(17.dp),
        )
    }
}

// ── Destructive footer card ───────────────────────────────────────────────────────

@Composable
private fun DestructiveActionCard(
    title: String,
    body: String?,
    buttonLabel: String,
    onClick: () -> Unit,
) {
    OutlinedCard(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 18.dp),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, Color(0xFFFECACA)),
        colors = CardDefaults.outlinedCardColors(containerColor = Color(0xFFFFF7F7)),
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFFEE2E2)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(TrashIcon, contentDescription = null, tint = Color(0xFFDC2626), modifier = Modifier.size(19.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(title, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color(0xFF991B1B))
                if (body != null) {
                    Text(body, fontSize = 12.sp, color = Color(0xFF7F1D1D), lineHeight = 16.sp, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 2.dp))
                }
            }
            OutlinedButton(
                onClick = onClick,
                shape = RoundedCornerShape(10.dp),
                border = BorderStroke(1.dp, Color(0xFFEF4444)),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFDC2626)),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 7.dp),
                modifier = Modifier.heightIn(min = 38.dp),
            ) {
                Text(buttonLabel, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }
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

private val PhotoImageIcon: ImageVector by lazy {
    ImageVector.Builder("PhotoImage", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke          = SolidColor(Color.Black),
            strokeLineWidth = 1.8f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
            strokeLineJoin  = androidx.compose.ui.graphics.StrokeJoin.Round,
        ) {
            moveTo(4.5f, 6.5f)
            curveTo(4.5f, 5.4f, 5.4f, 4.5f, 6.5f, 4.5f)
            lineTo(17.5f, 4.5f)
            curveTo(18.6f, 4.5f, 19.5f, 5.4f, 19.5f, 6.5f)
            lineTo(19.5f, 17.5f)
            curveTo(19.5f, 18.6f, 18.6f, 19.5f, 17.5f, 19.5f)
            lineTo(6.5f, 19.5f)
            curveTo(5.4f, 19.5f, 4.5f, 18.6f, 4.5f, 17.5f)
            close()
            moveTo(8f, 14.5f)
            lineTo(10.3f, 12.2f)
            curveTo(10.7f, 11.8f, 11.3f, 11.8f, 11.7f, 12.2f)
            lineTo(13f, 13.5f)
            lineTo(14.4f, 12.1f)
            curveTo(14.8f, 11.7f, 15.4f, 11.7f, 15.8f, 12.1f)
            lineTo(18.2f, 14.5f)
            moveTo(9f, 9f)
            lineTo(9.01f, 9f)
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

private fun bitmapToJpeg(bitmap: Bitmap): ByteArray =
    ByteArrayOutputStream().also { bitmap.compress(Bitmap.CompressFormat.JPEG, 85, it) }.toByteArray()

@Composable
private fun CordadaImageCropSheet(
    imageUri: Uri,
    onDismiss: () -> Unit,
    onDone: (Bitmap) -> Unit,
) {
    var cropImageView by remember { mutableStateOf<CropImageView?>(null) }
    var cropError by remember { mutableStateOf(false) }

    CordadaModalSheet(onDismiss = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(bottom = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(stringResource(R.string.cordadas_edit_photo), fontSize = 17.sp, fontWeight = FontWeight.SemiBold)

            AndroidView(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(420.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Color.Black),
                factory = { context ->
                    CropImageView(context).apply {
                        layoutParams = FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT,
                        )
                        setBackgroundColor(AndroidColor.BLACK)
                        setImageCropOptions(
                            CropImageOptions(
                                cropShape = CropImageView.CropShape.RECTANGLE,
                                cornerShape = CropImageView.CropCornerShape.RECTANGLE,
                                guidelines = CropImageView.Guidelines.ON,
                                scaleType = CropImageView.ScaleType.FIT_CENTER,
                                fixAspectRatio = true,
                                aspectRatioX = 3,
                                aspectRatioY = 2,
                                autoZoomEnabled = true,
                                multiTouchEnabled = true,
                                centerMoveEnabled = true,
                                maxZoom = 4,
                                initialCropWindowPaddingRatio = 0.04f,
                                borderLineThickness = 2f,
                                borderLineColor = AndroidColor.argb(220, 255, 255, 255),
                                borderCornerThickness = 3f,
                                borderCornerColor = AndroidColor.WHITE,
                                guidelinesThickness = 1f,
                                guidelinesColor = AndroidColor.argb(90, 255, 255, 255),
                                backgroundColor = AndroidColor.argb(150, 0, 0, 0),
                                showProgressBar = true,
                            ),
                        )
                        setImageUriAsync(imageUri)
                        tag = imageUri
                        cropImageView = this
                    }
                },
                update = { view ->
                    if (view.tag != imageUri) {
                        view.setImageUriAsync(imageUri)
                        view.tag = imageUri
                    }
                    cropImageView = view
                },
            )

            if (cropError) {
                Text(stringResource(R.string.friends_generic_error), fontSize = 13.sp, color = Color(0xFFDC2626))
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(onClick = { cropImageView?.rotateImage(90) }) {
                    Text(stringResource(R.string.new_ascent_rotate_btn), fontWeight = FontWeight.SemiBold)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(onClick = onDismiss) {
                        Text(stringResource(R.string.action_cancel))
                    }
                    Button(
                        onClick = {
                            val cropped = cropImageView?.getCroppedImage(
                                1200,
                                800,
                                CropImageView.RequestSizeOptions.RESIZE_FIT,
                            )
                            if (cropped != null) {
                                cropError = false
                                onDone(cropped)
                            } else {
                                cropError = true
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = PeakGreenCTA, contentColor = Color.White),
                    ) {
                        Text(stringResource(R.string.action_save), fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
fun CreateCordadaSheet(
    friends: List<FriendEntry>,
    isCreating: Boolean,
    onDismiss: () -> Unit,
    onCreate: (name: String, desc: String?, memberIds: List<String>, avatarBytes: ByteArray?) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var desc by remember { mutableStateOf("") }
    var avatarBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var cropUri by remember { mutableStateOf<Uri?>(null) }
    var memberQuery by remember { mutableStateOf("") }
    val selectedIds = remember { mutableStateListOf<String>() }
    val formScrollState = rememberScrollState()
    val focusManager = LocalFocusManager.current
    val scope = rememberCoroutineScope()
    val nameBringIntoView = remember { BringIntoViewRequester() }
    val descBringIntoView = remember { BringIntoViewRequester() }
    val membersBringIntoView = remember { BringIntoViewRequester() }

    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { cropUri = it }
    }

    CordadaModalSheet(onDismiss = { if (!isCreating) onDismiss() }) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(formScrollState)
                .padding(horizontal = 20.dp)
                .padding(bottom = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(stringResource(R.string.cordadas_create_title), fontSize = 17.sp, fontWeight = FontWeight.SemiBold)

            // Cordada image picker: one cropped 3:2 image, previewed as cover + avatar.
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(148.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color(0xFFF8FAFC))
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp))
                    .clickable(enabled = !isCreating) { photoPicker.launch("image/*") },
            ) {
                avatarBitmap?.let { bmp ->
                    Image(
                        bitmap = bmp.asImageBitmap(),
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .fillMaxWidth()
                            .height(64.dp)
                            .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.34f)))),
                    )
                    Text(
                        stringResource(R.string.cordadas_edit_photo),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White,
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(end = 14.dp, bottom = 13.dp),
                    )
                } ?: run {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Brush.linearGradient(listOf(Color(0xFFF8FAFC), Color(0xFFEFF6FF)))),
                    )
                    Column(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Box(
                            modifier = Modifier
                                .size(42.dp)
                                .clip(CircleShape)
                                .background(Color.White)
                                .border(1.dp, Color(0xFFE2E8F0), CircleShape),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(PhotoImageIcon, contentDescription = null, tint = PeakBlueActive, modifier = Modifier.size(21.dp))
                        }
                        Text(
                            stringResource(R.string.cordadas_add_photo),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = FriendsTextPrimary,
                        )
                        Text(
                            stringResource(R.string.cordadas_photo_hint),
                            fontSize = 12.sp,
                            color = FriendsTextSecondary,
                        )
                    }
                }
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(start = 14.dp, bottom = 12.dp)
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(Color.White)
                        .padding(2.dp)
                        .clip(CircleShape)
                        .background(Brush.linearGradient(listOf(Color(0xFF059669), Color(0xFF34D399)))),
                    contentAlignment = Alignment.Center,
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        avatarBitmap?.let { bmp ->
                            Image(
                                bitmap = bmp.asImageBitmap(),
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize(),
                            )
                        } ?: Icon(PhotoImageIcon, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                    }
                }
            }

            OutlinedTextField(
                value         = name,
                onValueChange = { if (it.length <= 60) name = it },
                label         = { Text(stringResource(R.string.cordadas_name_hint)) },
                singleLine    = true,
                modifier      = Modifier
                    .fillMaxWidth()
                    .bringIntoViewRequester(nameBringIntoView)
                    .onFocusChanged {
                        if (it.isFocused) {
                            scope.launch {
                                delay(250)
                                nameBringIntoView.bringIntoView()
                            }
                        }
                    },
                enabled       = !isCreating,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                keyboardActions = KeyboardActions(
                    onNext = { focusManager.moveFocus(FocusDirection.Down) },
                ),
            )
            OutlinedTextField(
                value         = desc,
                onValueChange = { if (it.length <= 200) desc = it },
                label         = { Text(stringResource(R.string.cordadas_desc_hint)) },
                minLines      = 2,
                maxLines      = 4,
                modifier      = Modifier
                    .fillMaxWidth()
                    .bringIntoViewRequester(descBringIntoView)
                    .onFocusChanged {
                        if (it.isFocused) {
                            scope.launch {
                                delay(250)
                                descBringIntoView.bringIntoView()
                            }
                        }
                    },
                enabled       = !isCreating,
                keyboardOptions = KeyboardOptions(imeAction = if (friends.isNotEmpty()) ImeAction.Next else ImeAction.Done),
                keyboardActions = KeyboardActions(
                    onNext = { focusManager.moveFocus(FocusDirection.Down) },
                    onDone = { focusManager.clearFocus() },
                ),
            )

            // Member selection (accepted friends): search locally, add chips.
            if (friends.isNotEmpty()) {
                val selectedSnapshot = selectedIds.toSet()
                val selectedFriends = friends.filter { it.friend.id in selectedSnapshot }
                val filteredFriends = friends
                    .filter { it.friend.id !in selectedSnapshot }
                    .filter {
                        val q = memberQuery.trim()
                        q.isBlank() ||
                            it.friend.name.contains(q, ignoreCase = true) ||
                            (it.friend.username?.contains(q, ignoreCase = true) == true)
                    }
                    .take(6)

                Text(
                    if (selectedIds.isEmpty()) stringResource(R.string.cordadas_add_members)
                    else "${stringResource(R.string.cordadas_add_members)} · ${selectedIds.size}",
                    fontSize   = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color      = Color(0xFF6B7280),
                )

                if (selectedFriends.isNotEmpty()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        selectedFriends.forEach { entry ->
                            Row(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(999.dp))
                                    .background(Color(0xFFEFF6FF))
                                    .border(1.dp, Color(0xFFBFDBFE), RoundedCornerShape(999.dp))
                                    .clickable(enabled = !isCreating) { selectedIds.remove(entry.friend.id) }
                                    .padding(start = 4.dp, end = 9.dp, top = 4.dp, bottom = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                UserAvatar(entry.friend.name, 24, entry.friend.avatarUrl)
                                Text(entry.friend.name, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = FriendsTextPrimary)
                                Text("×", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = FriendsTextMuted)
                            }
                        }
                    }
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFFF3F4F6))
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(SearchIconSmall, contentDescription = null, tint = Color.Unspecified, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    BasicTextField(
                        value = memberQuery,
                        onValueChange = { memberQuery = it },
                        singleLine = true,
                        enabled = !isCreating,
                        textStyle = LocalTextStyle.current.copy(fontSize = 16.sp, color = Color(0xFF111827)),
                        cursorBrush = SolidColor(PeakBlueActive),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(
                            onDone = { focusManager.clearFocus() },
                        ),
                        modifier = Modifier
                            .weight(1f)
                            .bringIntoViewRequester(membersBringIntoView)
                            .onFocusChanged {
                                if (it.isFocused) {
                                    scope.launch {
                                        delay(250)
                                        membersBringIntoView.bringIntoView()
                                    }
                                }
                            },
                        decorationBox = { inner ->
                            if (memberQuery.isEmpty()) Text(stringResource(R.string.cordadas_invite_search), fontSize = 16.sp, color = Color(0xFF9CA3AF))
                            inner()
                        },
                    )
                }

                if (memberQuery.isNotBlank() || selectedIds.isEmpty()) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 190.dp)
                            .verticalScroll(rememberScrollState()),
                    ) {
                        filteredFriends.forEach { entry ->
                            Row(
                                modifier          = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .clickable(enabled = !isCreating) {
                                        selectedIds.add(entry.friend.id)
                                        memberQuery = ""
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
                                Text("+", fontSize = 20.sp, fontWeight = FontWeight.SemiBold, color = PeakBlueActive)
                            }
                        }
                    }
                }
            }

            Button(
                onClick  = {
                    if (name.isNotBlank() && !isCreating) {
                        onCreate(
                            name.trim(),
                            desc.ifBlank { null },
                            selectedIds.toList(),
                            avatarBitmap?.let { bitmapToJpeg(it) },
                        )
                    }
                },
                enabled  = name.isNotBlank() && !isCreating,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors   = ButtonDefaults.buttonColors(
                    containerColor         = PeakGreenCTA,
                    contentColor           = Color.White,
                    disabledContainerColor = PeakGreenCTA.copy(alpha = 0.4f),
                    disabledContentColor   = Color.White,
                ),
            ) {
                if (isCreating) {
                    CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                } else {
                    Text(stringResource(R.string.cordadas_create_btn), fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }

    cropUri?.let { uri ->
        CordadaImageCropSheet(
            imageUri = uri,
            onDismiss = { cropUri = null },
            onDone = { cropped ->
                avatarBitmap = cropped
                cropUri = null
            },
        )
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
    val sheetScrollState = rememberScrollState()
    val focusManager = LocalFocusManager.current
    val scope = rememberCoroutineScope()
    val searchBringIntoView = remember { BringIntoViewRequester() }

    CordadaModalSheet(onDismiss = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(sheetScrollState)
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
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(
                        onDone = { focusManager.clearFocus() },
                    ),
                    modifier      = Modifier
                        .weight(1f)
                        .bringIntoViewRequester(searchBringIntoView)
                        .onFocusChanged {
                            if (it.isFocused) {
                                scope.launch {
                                    delay(250)
                                    searchBringIntoView.bringIntoView()
                                }
                            }
                        },
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
                            Text(stringResource(R.string.friends_request_sent), fontSize = 12.sp, color = FriendsTextMuted)
                        } else {
                            RowActionButton(stringResource(R.string.cordadas_invite_send), onClick = { onInvite(user) }, primary = true)
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
    var showInviteSheet   by remember { mutableStateOf(false) }
    var showConfirmLeave  by remember { mutableStateOf(false) }
    var showConfirmDelete by remember { mutableStateOf(false) }
    var expelTarget       by remember { mutableStateOf<CordadaMemberRanking?>(null) }
    var editImageUri      by remember { mutableStateOf<Uri?>(null) }

    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { editImageUri = it }
    }

    val accepted = detail.members.filter { !it.isPending }
    val pending  = detail.members.filter { it.isPending }

    // Closing the detail returns to the cordadas list (not out of the tab).
    BackHandler(enabled = true) { onBack() }

    Surface(modifier = Modifier.fillMaxSize(), color = PeakBackground) {
        Scaffold(
            // Full-screen destination on the outer navController. The real title lives
            // in the hero; the top bar stays quiet to avoid duplicating the cordada name.
            topBar = {
                TopAppBar(
                    title = {},
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(BackChevronIcon, contentDescription = stringResource(R.string.action_back), tint = Color.Unspecified)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
                )
                HRule()
            },
            containerColor = PeakBackground,
        ) { padding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState()),
            ) {
                // Cover image (editable) — full width, fixed height
                Box(modifier = Modifier.fillMaxWidth().height(180.dp)) {
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
                            Box(
                                modifier = Modifier
                                    .size(54.dp)
                                    .clip(CircleShape)
                                    .background(Color.White.copy(alpha = 0.18f)),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(PhotoImageIcon, contentDescription = null, tint = Color.White, modifier = Modifier.size(26.dp))
                            }
                        }
                    }
                    // Subtle bottom scrim to anchor the edit FAB
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .fillMaxWidth()
                            .height(92.dp)
                            .background(
                                Brush.verticalGradient(
                                    listOf(Color.Transparent, Color.Black.copy(alpha = 0.48f)),
                                ),
                            ),
                    )
                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(start = 16.dp, end = 72.dp, bottom = 14.dp),
                    ) {
                        Text(
                            detail.name,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(
                            cordadaMembersLabel(accepted.size),
                            fontSize = 13.sp,
                            color = Color.White.copy(alpha = 0.82f),
                            modifier = Modifier.padding(top = 2.dp),
                        )
                    }
                    if (detail.isOwner) {
                        SmallFloatingActionButton(
                            onClick        = { photoPicker.launch("image/*") },
                            containerColor = Color.White,
                            contentColor   = PeakBlueActive,
                            shape          = CircleShape,
                            elevation      = FloatingActionButtonDefaults.elevation(defaultElevation = 2.dp, pressedElevation = 4.dp),
                            modifier       = Modifier
                                .align(Alignment.BottomEnd)
                                .padding(8.dp)
                                .size(44.dp),
                        ) {
                            Icon(EditPencilIcon, contentDescription = stringResource(R.string.cordadas_edit_photo), modifier = Modifier.size(18.dp))
                        }
                    }
                }

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (!detail.description.isNullOrBlank()) {
                        Text(
                            detail.description,
                            fontSize = 14.sp,
                            color = FriendsTextPrimary,
                            lineHeight = 20.sp,
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(999.dp))
                                .background(Color.White)
                                .border(1.dp, Color(0xFFE5E7EB), RoundedCornerShape(999.dp))
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Icon(PeopleIcon, contentDescription = null, tint = FriendsTextSecondary, modifier = Modifier.size(15.dp))
                            Text(cordadaMembersLabel(accepted.size), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = FriendsTextSecondary)
                        }
                        if (pending.isNotEmpty()) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(999.dp))
                                    .background(Color(0xFFFFFBEB))
                                    .border(1.dp, Color(0xFFFDE68A), RoundedCornerShape(999.dp))
                                    .padding(horizontal = 10.dp, vertical = 6.dp),
                            ) {
                                Text(
                                    stringResource(R.string.cordadas_pending_count, pending.size),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFF92400E),
                                )
                            }
                        }
                    }

                    // Member avatars (small, overlapping ~22%) + invite button
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy((-8).dp)) {
                            accepted.take(10).forEach { m ->
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .background(Color.White)
                                        .padding(1.5.dp),
                                ) {
                                    UserAvatar(m.name, 33, m.avatarUrl)
                                }
                            }
                        }
                        if (detail.isOwner) {
                            Spacer(Modifier.width(10.dp))
                            AddMemberButton(onClick = { showInviteSheet = true })
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))

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

                // Footer destructive action
                if (detail.isOwner) {
                    DestructiveActionCard(
                        title = stringResource(R.string.cordadas_delete),
                        body = stringResource(R.string.cordadas_delete_detail),
                        buttonLabel = stringResource(R.string.cordadas_delete),
                        onClick = { showConfirmDelete = true },
                    )
                } else {
                    DestructiveActionCard(
                        title = stringResource(R.string.cordadas_leave),
                        body = null,
                        buttonLabel = stringResource(R.string.cordadas_leave),
                        onClick = { showConfirmLeave = true },
                    )
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
            title            = { Text(stringResource(R.string.cordadas_delete), fontWeight = FontWeight.Bold) },
            text             = { Text(stringResource(R.string.cordadas_delete_detail)) },
            confirmButton    = {
                TextButton(onClick = { showConfirmDelete = false; onDelete() }, colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFEF4444))) {
                    Text(stringResource(R.string.cordadas_delete_confirm_button))
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
    editImageUri?.let { uri ->
        CordadaImageCropSheet(
            imageUri = uri,
            onDismiss = { editImageUri = null },
            onDone = { cropped ->
                editImageUri = null
                onEditImage(bitmapToJpeg(cropped))
            },
        )
    }
}

// ── Cordada detail route (full-screen destination, own top bar) ──────────────────

@Composable
fun CordadaDetailRoute(
    cordadaId: String,
    onBack: () -> Unit,
    vm: CordadasViewModel = viewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()
    val currentUserId = AppContainer.authSession.currentUser.value?.id ?: ""

    LaunchedEffect(cordadaId) { vm.openDetail(cordadaId) }

    val detail = state.selectedDetail
    if (detail == null) {
        Surface(Modifier.fillMaxSize(), color = PeakBackground) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = PeakBlueActive)
            }
        }
    } else {
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
            onLeave             = { vm.leaveCordada(detail.id, currentUserId); onBack() },
            onDelete            = { vm.deleteCordada(detail.id); onBack() },
            onEditImage         = { vm.updateCordadaAvatar(detail.id, it) },
            onBack              = onBack,
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

private val PeopleIcon: ImageVector by lazy {
    ImageVector.Builder("People", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke          = SolidColor(Color(0xFF6B7280)),
            strokeLineWidth = 1.8f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
            strokeLineJoin  = androidx.compose.ui.graphics.StrokeJoin.Round,
        ) {
            // left person
            moveTo(8f, 11f)
            curveTo(9.66f, 11f, 11f, 9.66f, 11f, 8f)
            curveTo(11f, 6.34f, 9.66f, 5f, 8f, 5f)
            curveTo(6.34f, 5f, 5f, 6.34f, 5f, 8f)
            curveTo(5f, 9.66f, 6.34f, 11f, 8f, 11f)
            close()
            moveTo(2.5f, 19f)
            curveTo(2.5f, 15.96f, 4.96f, 13.5f, 8f, 13.5f)
            curveTo(11.04f, 13.5f, 13.5f, 15.96f, 13.5f, 19f)
            // right person (offset head + shoulder)
            moveTo(16f, 5.2f)
            curveTo(17.5f, 5.6f, 18.5f, 6.9f, 18.5f, 8.5f)
            curveTo(18.5f, 10.1f, 17.5f, 11.4f, 16f, 11.8f)
            moveTo(17f, 13.7f)
            curveTo(19.6f, 14.2f, 21.5f, 16.4f, 21.5f, 19f)
        }
    }.build()
}

private val TrashIcon: ImageVector by lazy {
    ImageVector.Builder("Trash", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke          = SolidColor(Color(0xFFEF4444)),
            strokeLineWidth = 2f,
            strokeLineCap   = androidx.compose.ui.graphics.StrokeCap.Round,
            strokeLineJoin  = androidx.compose.ui.graphics.StrokeJoin.Round,
        ) {
            moveTo(3f, 6f); lineTo(21f, 6f)
            moveTo(8f, 6f); lineTo(8f, 4f); lineTo(16f, 4f); lineTo(16f, 6f)
            moveTo(5f, 6f); lineTo(6f, 20f); lineTo(18f, 20f); lineTo(19f, 6f)
            moveTo(10f, 10f); lineTo(10f, 16f)
            moveTo(14f, 10f); lineTo(14f, 16f)
        }
    }.build()
}

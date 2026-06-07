package com.peakadex.app.feature.atlas

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.peakadex.app.R
import com.peakadex.app.core.ui.RARITY_PALETTE
import com.peakadex.app.core.ui.RarityInfo
import com.peakadex.app.core.ui.theme.PeakGreenCTA
import com.peakadex.app.core.ui.theme.PeakNavyDark
import com.peakadex.app.core.ui.theme.PeakNavyMid

// Background tints per rarity (matches web CARD_STYLES)
private fun rarityBg(id: String): Color = when (id) {
    "daisy"      -> Color(0xFFF0FDF7)
    "heather"    -> Color(0xFFECFEFF)
    "gentian"    -> Color(0xFFEFF6FF)
    "tundra"     -> Color(0xFFF0F9FF)
    "edelweiss"  -> Color(0xFFFAF5FF)
    "draba"      -> Color(0xFFFDF2F8)
    "saxifrage"  -> Color(0xFFFFF7ED)
    "cinquefoil" -> Color(0xFFFEFCE8)
    "snow_lotus" -> Color(0xFFF8FAFC)
    else         -> Color(0xFFF8FAFC)
}

private fun rarityBorder(id: String): Color = when (id) {
    "daisy"      -> Color(0xFF6EE7B7)
    "heather"    -> Color(0xFF67E8F9)
    "gentian"    -> Color(0xFF93C5FD)
    "tundra"     -> Color(0xFF7DD3FC)
    "edelweiss"  -> Color(0xFFD8B4FE)
    "draba"      -> Color(0xFFF9A8D4)
    "saxifrage"  -> Color(0xFFFDBA74)
    "cinquefoil" -> Color(0xFFFDE047)
    "snow_lotus" -> Color(0xFFCBD5E1)
    else         -> Color(0xFFE2E8F0)
}

/** Altitude range label — mirrors web altRange() */
private fun altRange(idx: Int): String {
    val cur  = RARITY_PALETTE[idx]
    val next = RARITY_PALETTE.getOrNull(idx + 1)
    return when {
        idx == 0 -> "< ${next!!.minAlt / 1000}.000 m"
        next == null -> "≥ ${cur.minAlt / 1000}.000 m"
        else -> "${cur.minAlt / 1000}.000 – ${(next.minAlt - 1) / 1000}.999 m"
    }
}

/**
 * Bottom sheet shown the first time a user opens the Atlas.
 * Explains the 9 rarity tiers using a 3-column LazyVerticalGrid.
 * Matches the web MapOnboardingModal design.
 *
 * @param onDismiss   Called when the user taps "Explore" or dismisses the sheet.
 * @param onDontShow  Called when the user checks "Don't show again" and confirms.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapOnboardingSheet(
    onDismiss: () -> Unit,
    onDontShow: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var dontShow by remember { mutableStateOf(false) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState       = sheetState,
        containerColor   = Color.White,
        dragHandle = {
            // Accent bar (blue→sky→indigo gradient) + drag handle — matches web
            Column {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp)
                        .background(
                            Brush.horizontalGradient(
                                listOf(Color(0xFF0369A1), Color(0xFF38BDF8), Color(0xFF818CF8))
                            )
                        ),
                )
                Box(
                    modifier            = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 10.dp),
                    contentAlignment    = Alignment.Center,
                ) {
                    Box(
                        modifier = Modifier
                            .width(36.dp).height(4.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(Color(0xFFE2E8F0)),
                    )
                }
            }
        },
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp)
                .padding(bottom = 20.dp),
        ) {
            // ── Title + subtitle ─────────────────────────────────────────────
            Text(
                text          = stringResource(R.string.map_onboarding_title),
                fontSize      = 22.sp,
                fontWeight    = FontWeight.ExtraBold,
                color         = PeakNavyDark,
                lineHeight    = 26.sp,
                letterSpacing = (-0.4).sp,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text       = stringResource(R.string.map_onboarding_sub),
                fontSize   = 13.sp,
                color      = PeakNavyMid,
                lineHeight = 19.sp,
            )

            Spacer(Modifier.height(18.dp))

            // ── "Rarity tiers" divider ───────────────────────────────────────
            Row(
                verticalAlignment     = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier              = Modifier.fillMaxWidth(),
            ) {
                HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFE2E8F0))
                Text(
                    text          = stringResource(R.string.map_onboarding_rarities).uppercase(),
                    fontSize      = 10.sp,
                    fontWeight    = FontWeight.Bold,
                    color         = Color(0xFF94A3B8),
                    letterSpacing = 0.8.sp,
                )
                HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFE2E8F0))
            }

            Spacer(Modifier.height(12.dp))

            // ── 3-column rarity grid ─────────────────────────────────────────
            LazyVerticalGrid(
                columns             = GridCells.Fixed(3),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement   = Arrangement.spacedBy(8.dp),
                modifier            = Modifier.fillMaxWidth(),
                // Fixed height so the grid doesn't conflict with ModalBottomSheet scroll
                userScrollEnabled   = false,
            ) {
                items(RARITY_PALETTE) { rarity ->
                    RarityCell(rarity = rarity, idx = RARITY_PALETTE.indexOf(rarity))
                }
            }

            Spacer(Modifier.height(20.dp))

            // ── CTA button ───────────────────────────────────────────────────
            Button(
                onClick = {
                    if (dontShow) onDontShow() else onDismiss()
                },
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape    = RoundedCornerShape(12.dp),
                colors   = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF0369A1),
                ),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp),
            ) {
                Text(
                    text       = stringResource(R.string.map_onboarding_cta),
                    fontSize   = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color      = Color.White,
                )
            }

            Spacer(Modifier.height(12.dp))

            // ── "Don't show again" checkbox ──────────────────────────────────
            Row(
                verticalAlignment     = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
                modifier              = Modifier.fillMaxWidth(),
            ) {
                Checkbox(
                    checked         = dontShow,
                    onCheckedChange = { dontShow = it },
                    colors          = CheckboxDefaults.colors(
                        checkedColor   = Color(0xFF0369A1),
                        uncheckedColor = Color(0xFFCBD5E1),
                    ),
                )
                Text(
                    text     = stringResource(R.string.map_onboarding_dont_show),
                    fontSize = 12.sp,
                    color    = Color(0xFF94A3B8),
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}

@Composable
private fun RarityCell(rarity: RarityInfo, idx: Int) {
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(rarityBg(rarity.id))
            .border(1.5.dp, rarityBorder(rarity.id), RoundedCornerShape(10.dp))
            .padding(horizontal = 6.dp, vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text     = "✿",
            fontSize = 22.sp,
            color    = rarity.color,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text          = rarity.label,
            fontSize      = 10.sp,
            fontWeight    = FontWeight.ExtraBold,
            color         = rarity.color,
            textAlign     = TextAlign.Center,
            lineHeight    = 12.sp,
        )
        Spacer(Modifier.height(2.dp))
        Text(
            text      = altRange(idx),
            fontSize  = 8.sp,
            color     = rarity.color.copy(alpha = 0.65f),
            textAlign = TextAlign.Center,
            lineHeight = 10.sp,
        )
    }
}

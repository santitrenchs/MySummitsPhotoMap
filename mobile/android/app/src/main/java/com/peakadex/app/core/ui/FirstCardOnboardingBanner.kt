package com.peakadex.app.core.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.peakadex.app.R
import com.peakadex.app.core.ui.theme.PeakGreenCTA
import com.peakadex.app.core.ui.theme.PeakNavyDark
import com.peakadex.app.core.ui.theme.PeakNavyMid

// Design tokens from PeakCard.tsx
private val CardBorder        = Color(0x170D2538)   // rgba(13,37,56,0.09)
private val CardShadow        = Color(0x240D2538)   // rgba(13,37,56,0.14)
private val AvatarColor       = Color(0xFFEC4899)   // Luc Moreau — pink
private val UserNameColor     = Color(0xFF0D2538)
private val DateColor         = Color(0xFF6B7280)
private val PeakNameColor     = Color.White
private val CoordsColor       = Color(0xBFFFFFFF)   // rgba(255,255,255,0.75)
private val StatBg            = Color(0xFFF8FAFC)
private val StatLabelColor    = Color(0x660D2538)   // rgba(13,37,56,0.4)
private val AltitudeColor     = Color(0xFF0D2538)
private val RarityColor       = Color(0xFFA855F7)   // Edelweiss purple
private val RewardColor       = Color(0xFFF97316)   // orange-500
private val ThreeDotsColor    = Color(0x4D0D2538)   // rgba(13,37,56,0.3)

/**
 * Reusable onboarding banner shown when the user has no ascents.
 * Uses the Mont Blanc collectible card (pixel-perfect match with peakadex.com/peaks/mont-blanc)
 * as the hero element. Can be reused across different sections of the app.
 *
 * @param onCapture  Called when the user taps the CTA button.
 */
@Composable
fun FirstCardOnboardingBanner(onCapture: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .shadow(elevation = 2.dp, shape = RoundedCornerShape(24.dp), spotColor = Color(0x14000000))
            .clip(RoundedCornerShape(24.dp))
            .background(Color.White)
            .padding(24.dp),
    ) {
        // ── Card + Text row ───────────────────────────────────────────────────
        Row(
            verticalAlignment     = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(20.dp),
            modifier              = Modifier.fillMaxWidth(),
        ) {
            // Left: Mont Blanc card mockup — fixed width so it stays compact
            MontBlancCardMockup(modifier = Modifier.width(130.dp))

            // Right: Headline + description
            Column(
                modifier            = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text          = stringResource(R.string.onboarding_card_title),
                    fontSize      = 22.sp,
                    fontWeight    = FontWeight.ExtraBold,
                    color         = PeakNavyDark,
                    lineHeight    = 26.sp,
                    letterSpacing = (-0.3).sp,
                )
                Text(
                    text       = stringResource(R.string.onboarding_card_desc),
                    fontSize   = 13.sp,
                    color      = PeakNavyMid,
                    lineHeight = 18.sp,
                )
            }
        }

        Spacer(Modifier.height(20.dp))

        // ── CTA button ────────────────────────────────────────────────────────
        Button(
            onClick   = onCapture,
            modifier  = Modifier.fillMaxWidth().height(52.dp),
            shape     = RoundedCornerShape(14.dp),
            colors    = ButtonDefaults.buttonColors(containerColor = PeakGreenCTA),
            elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp),
        ) {
            Text(
                text       = stringResource(R.string.onboarding_card_btn),
                fontSize   = 15.sp,
                fontWeight = FontWeight.Bold,
                color      = Color.White,
            )
        }
    }
}

// ── Mont Blanc card — pixel-perfect match with PeakCard.tsx ───────────────────

@Composable
private fun MontBlancCardMockup(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .shadow(
                elevation    = 16.dp,
                shape        = RoundedCornerShape(18.dp),
                spotColor    = CardShadow,
                ambientColor = Color(0x0F0D2538),
            )
            .clip(RoundedCornerShape(18.dp))
            .background(Color.White)
            .border(1.dp, CardBorder, RoundedCornerShape(18.dp)),
    ) {
        Column {

            // ── Header ────────────────────────────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                verticalAlignment     = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                // Avatar
                Box(
                    modifier         = Modifier
                        .size(20.dp)
                        .clip(CircleShape)
                        .background(AvatarColor),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text       = "LM",
                        fontSize   = 7.sp,
                        fontWeight = FontWeight.Bold,
                        color      = Color.White,
                    )
                }

                // Name + date
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text       = stringResource(R.string.onboarding_card_user),
                        fontSize   = 8.sp,
                        fontWeight = FontWeight.Bold,
                        color      = UserNameColor,
                        maxLines   = 1,
                    )
                    Text(
                        text     = stringResource(R.string.onboarding_card_date),
                        fontSize = 7.sp,
                        color    = DateColor,
                        maxLines = 1,
                    )
                }

                // 3-dot decorative menu
                Column(
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    repeat(3) {
                        Box(
                            modifier = Modifier
                                .size(2.dp)
                                .clip(CircleShape)
                                .background(ThreeDotsColor),
                        )
                    }
                }
            }

            // ── Photo ─────────────────────────────────────────────────────────
            Box(
                modifier = Modifier
                    .padding(horizontal = 6.dp)
                    .clip(RoundedCornerShape(10.dp)),
            ) {
                Image(
                    painter            = painterResource(R.drawable.onboarding_montblanc),
                    contentDescription = null,
                    contentScale       = ContentScale.Crop,
                    modifier           = Modifier
                        .fillMaxWidth()
                        .height(90.dp),
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight()
                        .background(
                            Brush.verticalGradient(
                                0.0f to Color.Transparent,
                                0.5f to Color(0x1A000000),
                                1.0f to Color(0x8C000000),
                            )
                        ),
                )
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(start = 8.dp, end = 8.dp, bottom = 7.dp),
                ) {
                    Text(
                        text       = stringResource(R.string.onboarding_card_peak),
                        fontSize   = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color      = PeakNameColor,
                        lineHeight = 13.sp,
                    )
                    Row(
                        verticalAlignment     = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(1.dp),
                    ) {
                        Text("📍", fontSize = 6.sp)
                        Text(
                            text     = stringResource(R.string.onboarding_card_coords),
                            fontSize = 6.sp,
                            color    = CoordsColor,
                            maxLines = 1,
                        )
                    }
                }
            }

            // ── Stats band — 3-column grid ─────────────────────────────────
            Row(
                modifier              = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 6.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                CardStatCell(label = "RAREZA", modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment     = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(2.dp),
                    ) {
                        Text("✿", fontSize = 7.sp, color = RarityColor)
                        Text(
                            text       = stringResource(R.string.onboarding_card_rarity),
                            fontSize   = 7.sp,
                            fontWeight = FontWeight.Bold,
                            color      = RarityColor,
                            maxLines   = 1,
                        )
                    }
                }
                CardStatCell(label = "ALTITUD", modifier = Modifier.weight(1f)) {
                    Text(
                        text       = stringResource(R.string.onboarding_card_altitude),
                        fontSize   = 7.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color      = AltitudeColor,
                    )
                }
                CardStatCell(label = "EP", modifier = Modifier.weight(1f)) {
                    Text(
                        text       = "+120",
                        fontSize   = 7.sp,
                        fontWeight = FontWeight.Bold,
                        color      = RewardColor,
                    )
                }
            }
        }
    }
}

@Composable
private fun CardStatCell(
    label: String,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier            = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(StatBg)
            .padding(horizontal = 3.dp, vertical = 5.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text          = label,
            fontSize      = 5.5.sp,
            fontWeight    = FontWeight.Bold,
            color         = StatLabelColor,
            letterSpacing = 0.4.sp,
            maxLines      = 1,
        )
        Spacer(Modifier.height(3.dp))
        content()
    }
}

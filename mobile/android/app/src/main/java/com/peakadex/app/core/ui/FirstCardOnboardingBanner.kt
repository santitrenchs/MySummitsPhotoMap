package com.peakadex.app.core.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
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
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.peakadex.app.R
import com.peakadex.app.core.ui.theme.PeakGreenCTA
import com.peakadex.app.core.ui.theme.PeakNavyDark
import com.peakadex.app.core.ui.theme.PeakNavyMid

/**
 * Reusable onboarding banner shown when the user has no ascents.
 * Uses the Mont Blanc collectible card as the hero element.
 * Can be reused across different sections of the app.
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
            verticalAlignment      = Alignment.CenterVertically,
            horizontalArrangement  = Arrangement.spacedBy(20.dp),
            modifier               = Modifier.fillMaxWidth(),
        ) {
            // Left: Mont Blanc card mockup (tilted)
            MontBlancCardMockup(
                modifier = Modifier
                    .weight(0.85f)
                    .wrapContentHeight(),
            )

            // Right: Headline + description
            Column(
                modifier            = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text       = stringResource(R.string.onboarding_card_title),
                    fontSize   = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color      = PeakNavyDark,
                    lineHeight = 26.sp,
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
            onClick  = onCapture,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape  = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = PeakGreenCTA),
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

// ── Mont Blanc card mockup ─────────────────────────────────────────────────────

@Composable
private fun MontBlancCardMockup(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .rotate(-4f)
            .shadow(
                elevation    = 12.dp,
                shape        = RoundedCornerShape(16.dp),
                spotColor    = Color(0x33000000),
                ambientColor = Color(0x1A000000),
            )
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White),
    ) {
        Column {
            // ── Card header ───────────────────────────────────────────────────
            Row(
                modifier          = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                // Avatar
                Box(
                    modifier         = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF3B82F6)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text       = "LM",
                        fontSize   = 8.sp,
                        fontWeight = FontWeight.Bold,
                        color      = Color.White,
                    )
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text       = stringResource(R.string.onboarding_card_user),
                        fontSize   = 9.sp,
                        fontWeight = FontWeight.SemiBold,
                        color      = Color(0xFF111827),
                    )
                    Text(
                        text     = stringResource(R.string.onboarding_card_date),
                        fontSize = 8.sp,
                        color    = Color(0xFF9CA3AF),
                    )
                }
            }

            // ── Mountain photo ────────────────────────────────────────────────
            Box {
                Image(
                    painter            = painterResource(R.drawable.onboarding_montblanc),
                    contentDescription = null,
                    contentScale       = ContentScale.Crop,
                    modifier           = Modifier
                        .fillMaxWidth()
                        .height(130.dp),
                )
                // Bottom gradient overlay with peak name
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .align(Alignment.BottomCenter)
                        .background(
                            androidx.compose.ui.graphics.Brush.verticalGradient(
                                listOf(Color.Transparent, Color(0xCC000000))
                            )
                        ),
                )
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(start = 10.dp, bottom = 8.dp),
                ) {
                    Text(
                        text       = stringResource(R.string.onboarding_card_peak),
                        fontSize   = 13.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color      = Color.White,
                    )
                    Text(
                        text     = stringResource(R.string.onboarding_card_coords),
                        fontSize = 7.sp,
                        color    = Color.White.copy(alpha = 0.8f),
                    )
                }
            }

            // ── Stats row ─────────────────────────────────────────────────────
            Row(
                modifier              = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                CardStat(label = "RARITY",   value = stringResource(R.string.onboarding_card_rarity), valueColor = Color(0xFF6366F1))
                CardStat(label = "ALTITUDE", value = stringResource(R.string.onboarding_card_altitude))
            }
        }
    }
}

@Composable
private fun CardStat(label: String, value: String, valueColor: Color = Color(0xFF111827)) {
    Column(horizontalAlignment = Alignment.Start) {
        Text(
            text       = label,
            fontSize   = 7.sp,
            fontWeight = FontWeight.SemiBold,
            color      = Color(0xFF9CA3AF),
            letterSpacing = 0.5.sp,
        )
        Text(
            text       = value,
            fontSize   = 10.sp,
            fontWeight = FontWeight.Bold,
            color      = valueColor,
        )
    }
}

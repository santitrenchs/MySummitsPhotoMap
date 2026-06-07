package com.peakadex.app.core.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
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
            MontBlancCardMockup(modifier = Modifier.width(172.dp))

            // Right: Headline + description + CTA
            Column(
                modifier            = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text(
                    text          = stringResource(R.string.onboarding_card_title),
                    fontSize      = 17.sp,
                    fontWeight    = FontWeight.ExtraBold,
                    color         = PeakNavyDark,
                    lineHeight    = 21.sp,
                    letterSpacing = (-0.2).sp,
                )
                Text(
                    text       = stringResource(R.string.onboarding_card_desc),
                    fontSize   = 12.sp,
                    color      = PeakNavyMid,
                    lineHeight = 16.sp,
                )
                Spacer(Modifier.height(2.dp))
                // ── CTA — same width as text column ──────────────────────────
                Button(
                    onClick   = onCapture,
                    modifier  = Modifier.fillMaxWidth().height(44.dp),
                    shape     = RoundedCornerShape(12.dp),
                    colors    = ButtonDefaults.buttonColors(containerColor = PeakGreenCTA),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp),
                ) {
                    Text(
                        text       = stringResource(R.string.onboarding_card_btn),
                        fontSize   = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color      = Color.White,
                    )
                }
            }
        }   // end Row
    }       // end Column / FirstCardOnboardingBanner
}

// ── Mont Blanc card — uses pre-rendered PNG asset for pixel-perfect proportions ─

@Composable
private fun MontBlancCardMockup(modifier: Modifier = Modifier) {
    // shadow() applied directly to the Image clips it to the card shape,
    // matching the PNG's own rounded corners and producing a clean drop shadow.
    Image(
        painter            = painterResource(R.drawable.onboarding_ecrins),
        contentDescription = null,
        contentScale       = ContentScale.Fit,
        modifier           = modifier,
    )
}

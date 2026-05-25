package com.peakadex.app.core.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material3.Text
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.TextUnit
import com.peakadex.app.R
import com.peakadex.app.core.ui.theme.PeakNavyDark

val ManropeFamily = FontFamily(
    Font(R.font.manrope_extrabold, FontWeight.ExtraBold),
)

/**
 * Replicates the web wordmark: "peak[icon]adex"
 * - "peak" → navy #0D2538
 * - center icon → ic_peakadex.png
 * - "adex" → slate #4E6178
 * - Font: Manrope 800, letterSpacing -0.02em
 *
 * @param height Controls the overall size. Icon scales with it.
 */
@Composable
fun PeakadexLogo(
    height: Dp = 40.dp,
    modifier: Modifier = Modifier,
) {
    // Match web Logo.tsx exactly:
    // fontSize   = height × 0.72
    // iconSize   = height × 1.0
    // gap        = height × 0.28  (marginRight on "peak", marginLeft on "adex")
    val fontSize: TextUnit = (height.value * 0.72f).sp
    val iconSize: Dp       = height
    val gap: Dp            = height * 0.28f
    val letterSpacing      = (-0.02f).sp

    val textStyle = TextStyle(
        fontFamily    = ManropeFamily,
        fontWeight    = FontWeight.ExtraBold,
        fontSize      = fontSize,
        letterSpacing = letterSpacing,
        lineHeight    = fontSize,
    )

    Row(
        modifier          = modifier.height(height),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // "peak"
        Text(
            text  = "peak",
            style = textStyle.copy(color = PeakNavyDark),
        )

        Spacer(modifier = Modifier.width(gap))

        // icon
        Image(
            painter            = painterResource(id = R.drawable.ic_peakadex),
            contentDescription = null,
            modifier           = Modifier.size(iconSize),
        )

        Spacer(modifier = Modifier.width(gap))

        // "adex"
        Text(
            text  = "adex",
            style = textStyle.copy(color = Color(0xFF4E6178)),
        )
    }
}

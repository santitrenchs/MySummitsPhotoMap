package com.peakadex.app.feature.newascent

import androidx.compose.foundation.background
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.EaseOutBack
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.peakadex.app.R
import com.peakadex.app.core.ui.RarityInfo
import com.peakadex.app.core.ui.theme.PeakBackground
import com.peakadex.app.core.ui.theme.PeakNavyDark

@Composable
fun AscentCaptureReveal(
    ascentId: String,
    rarity: RarityInfo,
    onFinished: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .clickable(onClick = onFinished)
            .background(
                Brush.radialGradient(
                    colors = listOf(
                        rarity.color.copy(alpha = 0.26f),
                        Color.White,
                        PeakBackground,
                    ),
                ),
            )
            .padding(horizontal = 28.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(22.dp),
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(300.dp),
                color = Color.Transparent,
                shape = RoundedCornerShape(8.dp),
            ) {
                CaptureFlowerFallback(rarity.color)
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text = stringResource(R.string.capture_reveal_title, rarity.label),
                    color = PeakNavyDark,
                    fontSize = 26.sp,
                    fontWeight = FontWeight.ExtraBold,
                    textAlign = TextAlign.Center,
                    lineHeight = 31.sp,
                )
                Text(
                    text = stringResource(R.string.capture_reveal_subtitle),
                    color = rarity.color,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = stringResource(R.string.capture_reveal_continue),
                    color = PeakNavyDark.copy(alpha = 0.58f),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun CaptureFlowerFallback(color: Color) {
    val bloom = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        bloom.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 900, easing = EaseOutBack),
        )
    }

    Canvas(modifier = Modifier.fillMaxSize()) {
        val center = this.center
        val petalRadius = size.minDimension * 0.18f
        val petalDistance = size.minDimension * 0.16f * bloom.value

        repeat(8) { index ->
            val angle = Math.toRadians((index * 45.0) - 90.0)
            val petalCenter = androidx.compose.ui.geometry.Offset(
                x = center.x + kotlin.math.cos(angle).toFloat() * petalDistance,
                y = center.y + kotlin.math.sin(angle).toFloat() * petalDistance,
            )
            drawCircle(
                color = color.copy(alpha = 0.72f),
                radius = petalRadius * bloom.value.coerceAtLeast(0.12f),
                center = petalCenter,
            )
        }

        drawCircle(color = Color.White, radius = petalRadius * 0.78f, center = center)
        drawCircle(color = color, radius = petalRadius * 0.48f, center = center)

        val stem = Path().apply {
            moveTo(center.x, center.y + petalRadius)
            cubicTo(
                center.x - petalRadius * 0.4f,
                center.y + petalRadius * 2.0f,
                center.x + petalRadius * 0.25f,
                center.y + petalRadius * 2.8f,
                center.x - petalRadius * 0.2f,
                center.y + petalRadius * 3.4f,
            )
        }
        drawPath(stem, Color(0xFF0F766E), style = androidx.compose.ui.graphics.drawscope.Stroke(width = 7f))
    }
}

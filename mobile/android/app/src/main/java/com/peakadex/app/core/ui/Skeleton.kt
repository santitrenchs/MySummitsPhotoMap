package com.peakadex.app.core.ui

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.dp

@Composable
fun rememberSkeletonBrush(label: String = "skeleton"): Brush {
    val transition = rememberInfiniteTransition(label = label)
    val x by transition.animateFloat(
        initialValue = -350f,
        targetValue = 1100f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200),
            repeatMode = RepeatMode.Restart,
        ),
        label = "${label}Shimmer",
    )
    val base = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.62f)
    val highlight = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.95f)
    return Brush.linearGradient(
        colors = listOf(base, highlight, base),
        start = Offset(x, 0f),
        end = Offset(x + 350f, 0f),
    )
}

@Composable
fun SkeletonBlock(
    brush: Brush,
    modifier: Modifier,
    shape: RoundedCornerShape = RoundedCornerShape(8.dp),
) {
    Box(
        modifier = modifier
            .clip(shape)
            .background(brush),
    )
}

package com.peakadex.app.feature.newascent

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.EaseOutBack
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.airbnb.lottie.LottieProperty
import com.airbnb.lottie.compose.LottieAnimation
import com.airbnb.lottie.compose.LottieCompositionSpec
import com.airbnb.lottie.compose.rememberLottieAnimatable
import com.airbnb.lottie.compose.rememberLottieComposition
import com.airbnb.lottie.compose.rememberLottieDynamicProperties
import com.airbnb.lottie.compose.rememberLottieDynamicProperty
import com.peakadex.app.R
import com.peakadex.app.core.model.Ascent
import com.peakadex.app.core.ui.RarityInfo
import com.peakadex.app.feature.logbook.CardFront
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

// ── Reveal phase state machine ─────────────────────────────────────────────────
// BLOOM  → card blurred + flower animation on top + text (waits for tap)
// REVEAL → blur dissolves → card comes into focus → navigate away

private enum class RevealPhase { BLOOM, REVEAL }

// ── Main composable ────────────────────────────────────────────────────────────

@Composable
fun AscentCaptureReveal(
    ascent:     Ascent,
    rarity:     RarityInfo,
    isMythic:   Boolean = false,
    onFinished: () -> Unit,
    modifier:   Modifier = Modifier,
) {
    var phase by remember { mutableStateOf(RevealPhase.BLOOM) }
    val scope = rememberCoroutineScope()

    // Blur: 6dp (subtle, card still legible) → 0dp when revealed
    val blurRadius by animateDpAsState(
        targetValue   = if (phase == RevealPhase.BLOOM) 6.dp else 0.dp,
        animationSpec = tween(durationMillis = 1200),
        label         = "blur",
    )
    // Dark overlay: light tint so card shows through → 0 when revealed
    val overlayAlpha by animateFloatAsState(
        targetValue   = if (phase == RevealPhase.BLOOM) 0.28f else 0f,
        animationSpec = tween(durationMillis = 1200),
        label         = "overlay",
    )
    // Bloom layer: fades out when revealed
    val bloomAlpha by animateFloatAsState(
        targetValue   = if (phase == RevealPhase.BLOOM) 1f else 0f,
        animationSpec = tween(durationMillis = 600),
        label         = "bloom",
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF0A1628))  // dark navy — flower and card pop against it
            .clickable(
                enabled           = phase == RevealPhase.BLOOM,
                indication        = null,
                interactionSource = remember { MutableInteractionSource() },
            ) {
                phase = RevealPhase.REVEAL
                scope.launch {
                    delay(1200)
                    onFinished()
                }
            },
    ) {

        // ── 1. Card with soft blur ─────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .align(Alignment.Center)
                .blur(blurRadius),
        ) {
            CardFront(
                ascent        = ascent,
                rarity        = rarity,
                onDetailClick = {},
                onShareClick  = {},
            )
        }

        // ── 2. Light dark overlay ─────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = overlayAlpha)),
        )

        // ── 3. Mythic glow (centered, behind bloom) ───────────────────────────
        if (isMythic) {
            MythicGlow(modifier = Modifier.align(Alignment.Center))
        }

        // ── 4. Lottie flower — centered ───────────────────────────────────────
        if (bloomAlpha > 0f) {
            BloomLottie(
                rarity    = rarity,
                replayKey = ascent.id,
                modifier  = Modifier
                    .align(Alignment.Center)
                    .alpha(bloomAlpha),
            )
        }

        // ── 5. Text block — bottom-anchored above nav bar ─────────────────────
        if (bloomAlpha > 0f) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .alpha(bloomAlpha)
                    .navigationBarsPadding()
                    .padding(bottom = 80.dp, start = 28.dp, end = 28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                // Rarity name
                Text(
                    text       = rarity.label,
                    color      = rarity.color,
                    fontSize   = 30.sp,
                    fontWeight = FontWeight.ExtraBold,
                    textAlign  = TextAlign.Center,
                )
                // Subtitle
                Text(
                    text       = if (isMythic)
                        stringResource(R.string.capture_reveal_subtitle_mythic)
                    else
                        stringResource(R.string.capture_reveal_subtitle),
                    color      = Color.White,
                    fontSize   = 15.sp,
                    fontWeight = FontWeight.Medium,
                    textAlign  = TextAlign.Center,
                )
                // EP reward
                Text(
                    text       = stringResource(R.string.capture_reveal_ep, rarity.ep),
                    color      = if (isMythic) Color(0xFFFFD700) else rarity.color,
                    fontSize   = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    textAlign  = TextAlign.Center,
                )
                Spacer(Modifier.height(8.dp))
                // Tap hint
                Text(
                    text       = stringResource(R.string.capture_reveal_continue),
                    color      = Color.White.copy(alpha = 0.55f),
                    fontSize   = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign  = TextAlign.Center,
                )
            }
        }

        // ── 6. Mythic particles ───────────────────────────────────────────────
        if (isMythic && bloomAlpha > 0f) {
            MythicParticles(
                replayKey = ascent.id,
                modifier  = Modifier.fillMaxSize(),
            )
        }
    }
}

// ── Mythic: pulsing radial glow ────────────────────────────────────────────────

@Composable
private fun MythicGlow(modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "mythic_glow")
    val glowAlpha by infiniteTransition.animateFloat(
        initialValue  = 0.25f,
        targetValue   = 0.72f,
        animationSpec = infiniteRepeatable(
            animation  = tween(durationMillis = 900),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "glow_alpha",
    )

    Box(
        modifier = modifier
            .size(320.dp)
            .background(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFFFFD700).copy(alpha = glowAlpha),
                        Color(0xFFFFD700).copy(alpha = glowAlpha * 0.3f),
                        Color.Transparent,
                    ),
                ),
                shape = CircleShape,
            ),
    )
}

// ── Mythic: radial burst particles ────────────────────────────────────────────

@Composable
private fun MythicParticles(
    replayKey: String,
    modifier:  Modifier = Modifier,
) {
    val particles = remember(replayKey) { List(8) { Animatable(0f) } }

    LaunchedEffect(replayKey) {
        particles.forEachIndexed { i, anim ->
            launch {
                delay(i * 90L)
                anim.animateTo(
                    targetValue   = 1f,
                    animationSpec = tween(durationMillis = 750),
                )
            }
        }
    }

    Canvas(modifier = modifier) {
        val cx = size.width  / 2f
        val cy = size.height / 2f

        particles.forEachIndexed { i, anim ->
            val progress = anim.value
            val angle    = Math.toRadians(i * 45.0 - 90.0)
            val dist     = 155.dp.toPx() * progress
            val radius   = 7.dp.toPx() * (1f - progress * 0.4f)
            val alpha    = (1f - progress).coerceIn(0f, 1f)

            drawCircle(
                color  = Color(0xFFFFD700).copy(alpha = alpha * 0.9f),
                radius = radius,
                center = Offset(
                    x = cx + cos(angle).toFloat() * dist,
                    y = cy + sin(angle).toFloat() * dist,
                ),
            )
            drawCircle(
                color  = Color.White.copy(alpha = alpha * 0.6f),
                radius = 3.dp.toPx() * (1f - progress),
                center = Offset(
                    x = cx + cos(angle).toFloat() * dist * 0.6f,
                    y = cy + sin(angle).toFloat() * dist * 0.6f,
                ),
            )
        }
    }
}

// ── Lottie bloom animation ─────────────────────────────────────────────────────
// Uses rememberLottieAnimatable so the animation freezes on the last frame
// after playing once — the flower stays fully bloomed until the user taps.

@Composable
private fun BloomLottie(
    rarity:    RarityInfo,
    replayKey: String = "",
    modifier:  Modifier = Modifier,
) {
    val composition by rememberLottieComposition(
        LottieCompositionSpec.RawRes(R.raw.flower_bloom),
    )

    // Use animatable so we can freeze on last frame (progress = 1f) after playing
    val lottieAnimatable = rememberLottieAnimatable()
    LaunchedEffect(composition, replayKey) {
        if (composition != null) {
            lottieAnimatable.animate(
                composition = composition,
                iterations  = 1,
            )
            // animate() returns when done — lottieAnimatable.progress is now 1f
            // (last frame = flower fully bloomed). Stays here until recomposition.
        }
    }

    val dynamicProperties = rememberLottieDynamicProperties(
        // Wildcard: tints ALL fill layers with rarity color.
        // Leaves/stem will also be tinted — acceptable for v1 since it ensures
        // the animation is always visible. Refine keypaths once we can test per-layer.
        rememberLottieDynamicProperty(
            property = LottieProperty.COLOR,
            value    = rarity.color.toArgb(),
            keyPath  = arrayOf("**"),
        ),
    )

    Box(
        modifier         = modifier.size(240.dp),
        contentAlignment = Alignment.Center,
    ) {
        LottieAnimation(
            composition       = composition,
            progress          = { lottieAnimatable.progress },
            dynamicProperties = dynamicProperties,
            modifier          = Modifier.fillMaxSize(),
        )
    }
}

// ── Canvas fallback (safety net if Lottie composition fails to load) ───────────

@Suppress("unused")
@Composable
private fun CaptureFlowerFallback(color: Color, replayKey: String) {
    val bloom = remember(replayKey) { Animatable(0f) }

    LaunchedEffect(replayKey) {
        bloom.animateTo(
            targetValue   = 1f,
            animationSpec = tween(durationMillis = 900, easing = EaseOutBack),
        )
    }

    Canvas(modifier = Modifier.size(240.dp)) {
        val center        = this.center
        val petalRadius   = size.minDimension * 0.18f
        val petalDistance = size.minDimension * 0.16f * bloom.value

        repeat(8) { index ->
            val angle = Math.toRadians((index * 45.0) - 90.0)
            val petalCenter = Offset(
                x = center.x + cos(angle).toFloat() * petalDistance,
                y = center.y + sin(angle).toFloat() * petalDistance,
            )
            drawCircle(
                color  = color.copy(alpha = 0.72f),
                radius = petalRadius * bloom.value.coerceAtLeast(0.12f),
                center = petalCenter,
            )
        }
        drawCircle(color = Color.White, radius = petalRadius * 0.78f, center = center)
        drawCircle(color = color,       radius = petalRadius * 0.48f, center = center)

        val stem = Path().apply {
            moveTo(center.x, center.y + petalRadius)
            cubicTo(
                center.x - petalRadius * 0.4f,  center.y + petalRadius * 2.0f,
                center.x + petalRadius * 0.25f, center.y + petalRadius * 2.8f,
                center.x - petalRadius * 0.2f,  center.y + petalRadius * 3.4f,
            )
        }
        drawPath(stem, Color(0xFF0F766E), style = Stroke(width = 7f))
    }
}

@Suppress("unused")
private fun distanceFloat(a: Offset, b: Offset): Float {
    val dx = a.x - b.x; val dy = a.y - b.y
    return sqrt(dx * dx + dy * dy)
}

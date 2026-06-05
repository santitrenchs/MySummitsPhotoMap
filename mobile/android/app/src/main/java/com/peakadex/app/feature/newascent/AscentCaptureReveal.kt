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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.airbnb.lottie.LottieProperty
import com.airbnb.lottie.compose.LottieAnimation
import com.airbnb.lottie.compose.LottieCompositionSpec
import com.airbnb.lottie.compose.animateLottieCompositionAsState
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

    // Blur: card stays recognisable but clearly behind the flower → 0 when revealed
    val blurRadius by animateDpAsState(
        targetValue   = if (phase == RevealPhase.BLOOM) 14.dp else 0.dp,
        animationSpec = tween(durationMillis = 1200),
        label         = "blur",
    )
    // Dark overlay: darker so the flower + text pop → 0 when revealed
    val overlayAlpha by animateFloatAsState(
        targetValue   = if (phase == RevealPhase.BLOOM) 0.48f else 0f,
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

        // ── 2. Dark overlay ───────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = overlayAlpha)),
        )

        // ── 3. Radial scrim behind the flower (extra contrast so it pops) ──────
        if (bloomAlpha > 0f) {
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(360.dp)
                    .alpha(bloomAlpha)
                    .background(
                        brush = Brush.radialGradient(
                            colors = listOf(
                                Color.Black.copy(alpha = 0.38f),
                                Color.Transparent,
                            ),
                        ),
                    ),
            )
        }

        // ── 4. Mythic glow (centered, behind bloom) ───────────────────────────
        if (isMythic) {
            MythicGlow(modifier = Modifier.align(Alignment.Center))
        }

        // ── 5. Flower + text grouped, centered ────────────────────────────────
        if (bloomAlpha > 0f) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.Center)
                    .alpha(bloomAlpha)
                    .padding(horizontal = 28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                BloomLottie(
                    rarity    = rarity,
                    replayKey = ascent.id,
                )

                // Headline
                Text(
                    text       = if (isMythic)
                        stringResource(R.string.capture_reveal_subtitle_mythic)
                    else
                        stringResource(R.string.capture_reveal_headline),
                    color      = Color.White,
                    fontSize   = 20.sp,
                    fontWeight = FontWeight.ExtraBold,
                    textAlign  = TextAlign.Center,
                    lineHeight = 24.sp,
                )
                // Rarity line — "Rareza «Gentian»" with name in rarity color
                Text(
                    text = buildAnnotatedString {
                        val template = stringResource(R.string.capture_reveal_rarity_line, rarity.label)
                        val idx = template.indexOf(rarity.label)
                        if (idx >= 0) {
                            withStyle(SpanStyle(color = Color.White.copy(alpha = 0.85f))) {
                                append(template.substring(0, idx))
                            }
                            withStyle(SpanStyle(color = rarity.color, fontWeight = FontWeight.ExtraBold)) {
                                append(rarity.label)
                            }
                            withStyle(SpanStyle(color = Color.White.copy(alpha = 0.85f))) {
                                append(template.substring(idx + rarity.label.length))
                            }
                        } else {
                            append(template)
                        }
                    },
                    fontSize   = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign  = TextAlign.Center,
                )
                Spacer(Modifier.height(2.dp))
                // EP reward
                Text(
                    text       = stringResource(R.string.capture_reveal_ep, rarity.ep),
                    color      = if (isMythic) Color(0xFFFFD700) else rarity.color,
                    fontSize   = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    textAlign  = TextAlign.Center,
                )
                Spacer(Modifier.height(10.dp))
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
// Phase 1: the flower grows once at GROW_SPEED.
// Phase 2: once grown, it stays fully bloomed but "alive" — a subtle breathing
//          scale + gentle sway, so it never looks like a frozen frame.

// Tuning knobs — adjust to taste:
private const val GROW_SPEED      = 0.5f    // <1 slower / dramatic, >1 faster (slower also gives card photo time to load)
private const val BREATHE_SCALE   = 0.035f  // breathing amplitude (3.5% size pulse)
private const val BREATHE_MS      = 2600    // one breath cycle (in→out)
private const val SWAY_DEGREES    = 1.5f    // gentle left-right tilt
private const val SWAY_MS         = 3400    // one sway cycle

@Composable
private fun BloomLottie(
    rarity:    RarityInfo,
    replayKey: String = "",
    modifier:  Modifier = Modifier,
) {
    val compositionResult = rememberLottieComposition(
        LottieCompositionSpec.RawRes(R.raw.flower_bloom),
    )
    val composition = compositionResult.value

    // ── DEBUG: log composition load state ──────────────────────────────────────
    LaunchedEffect(composition, compositionResult.isFailure) {
        android.util.Log.d(
            "CaptureReveal",
            "Lottie state — loading=${compositionResult.isLoading} " +
                "complete=${compositionResult.isComplete} " +
                "failure=${compositionResult.isFailure} " +
                "composition=${if (composition != null) "LOADED (${composition.durationFrames}f)" else "null"} " +
                "error=${compositionResult.error?.message}",
        )
    }

    // Auto-playing progress. iterations=1 → plays once and holds last frame.
    val progress by animateLottieCompositionAsState(
        composition = composition,
        iterations  = 1,
        speed       = GROW_SPEED,
        restartOnPlay = false,
    )
    val bloomed = progress >= 0.99f

    // Phase 2 — breathing + sway, only after fully grown.
    val infinite = rememberInfiniteTransition(label = "flower_alive")
    val breathe by infinite.animateFloat(
        initialValue  = 1f,
        targetValue   = 1f + BREATHE_SCALE,
        animationSpec = infiniteRepeatable(tween(BREATHE_MS), RepeatMode.Reverse),
        label         = "breathe",
    )
    val sway by infinite.animateFloat(
        initialValue  = -SWAY_DEGREES,
        targetValue   = SWAY_DEGREES,
        animationSpec = infiniteRepeatable(tween(SWAY_MS), RepeatMode.Reverse),
        label         = "sway",
    )
    val aliveScale = if (bloomed) breathe else 1f
    val aliveSway  = if (bloomed) sway   else 0f

    // Tint ONLY the petals (Group 8 in the precomp) — leave stem/leaves/center
    // in their natural colors. Center (Group 7) gets the darker shade.
    val centerColor = remember(rarity.color) {
        rarity.color.copy(
            red   = (rarity.color.red   * 0.6f).coerceIn(0f, 1f),
            green = (rarity.color.green * 0.6f).coerceIn(0f, 1f),
            blue  = (rarity.color.blue  * 0.6f).coerceIn(0f, 1f),
        )
    }
    val dynamicProperties = rememberLottieDynamicProperties(
        // Petals
        rememberLottieDynamicProperty(
            property = LottieProperty.COLOR,
            value    = rarity.color.toArgb(),
            keyPath  = arrayOf("Pre-comp 1", "Layer 2", "Group 8", "Fill 1"),
        ),
        // Flower center (the orange disc)
        rememberLottieDynamicProperty(
            property = LottieProperty.COLOR,
            value    = centerColor.toArgb(),
            keyPath  = arrayOf("Pre-comp 1", "Layer 2", "Group 7", "Fill 1"),
        ),
    )

    Box(
        modifier         = modifier.size(240.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (composition != null) {
            LottieAnimation(
                composition       = composition,
                progress          = { progress },
                dynamicProperties = dynamicProperties,
                modifier          = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        scaleX          = aliveScale
                        scaleY          = aliveScale
                        rotationZ       = aliveSway
                        transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0.5f, 0.85f)
                    },
            )
        } else {
            // Lottie failed/slow to load → show the Canvas flower so SOMETHING shows.
            // If you see THIS simple flower instead of the sunflower, the JSON failed.
            CaptureFlowerFallback(color = rarity.color, replayKey = replayKey)
        }
    }
}

// ── Canvas fallback (safety net if Lottie composition fails to load) ───────────

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

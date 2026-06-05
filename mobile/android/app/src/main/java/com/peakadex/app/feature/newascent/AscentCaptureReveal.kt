package com.peakadex.app.feature.newascent

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.EaseOutBack
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
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
import kotlin.math.roundToInt
import kotlin.math.sin

// ── Timeline (ms) — staged cinematic reveal ─────────────────────────────────────
// Card stays blurred behind the whole build-up. On tap, a "focus pull" sharpens
// the card (blur → 0) and fades the overlay, as if discovering the card.
private const val GROW_SPEED   = 0.85f   // flower bloom speed (file is 2s → ~2.35s)
private const val T_INFO       = 1500L   // info block (unlocked + peak + pills) appears together
private const val T_EP         = 1200L   // EP starts after bloom finishes (~20% longer beat)
private const val EP_COUNT_MS  = 900L    // EP roll-up duration

private enum class RevealPhase { BUILD, REVEAL }

@Composable
fun AscentCaptureReveal(
    ascent:     Ascent,
    rarity:     RarityInfo,
    isMythic:   Boolean = false,
    onFinished: () -> Unit,
    modifier:   Modifier = Modifier,
) {
    var phase by remember { mutableStateOf(RevealPhase.BUILD) }
    val scope = rememberCoroutineScope()

    // Info block (Carta desbloqueada + peak name + pills) all appear together.
    var showInfo by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        delay(T_INFO)
        showInfo = true
    }

    // Bloom completion is reported by BloomLottie; EP only starts once the
    // flower is fully open and breathing (with a longer beat after).
    var bloomDone by remember { mutableStateOf(false) }
    var epStarted by remember { mutableStateOf(false) }

    // EP roll-up + bounce — gated on bloomDone
    val epCount = remember { Animatable(0f) }
    var epDone  by remember { mutableStateOf(false) }
    LaunchedEffect(bloomDone) {
        if (bloomDone && !epDone) {
            delay(T_EP)            // longer beat after the flower settles
            epStarted = true
            epCount.animateTo(rarity.ep.toFloat(), tween(EP_COUNT_MS.toInt(), easing = LinearOutSlowInEasing))
            epDone = true
        }
    }
    val epPop = remember { Animatable(1f) }
    LaunchedEffect(epDone) {
        if (epDone) {
            epPop.animateTo(1.28f, tween(120))
            epPop.animateTo(1f, spring(dampingRatio = 0.42f, stiffness = 340f))
        }
    }

    // Focus-pull on tap: card sharpens, overlay dissolves
    val blurRadius by animateDpAsState(
        targetValue   = if (phase == RevealPhase.BUILD) 16.dp else 0.dp,
        animationSpec = tween(durationMillis = 750),
        label         = "blur",
    )
    val overlayAlpha by animateFloatAsState(
        targetValue   = if (phase == RevealPhase.BUILD) 0.80f else 0f,
        animationSpec = tween(durationMillis = 750),
        label         = "overlay",
    )
    val contentAlpha by animateFloatAsState(
        targetValue   = if (phase == RevealPhase.BUILD) 1f else 0f,
        animationSpec = tween(durationMillis = 450),
        label         = "content",
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF0A1628))
            .clickable(
                enabled           = phase == RevealPhase.BUILD,
                indication        = null,
                interactionSource = remember { MutableInteractionSource() },
            ) {
                phase = RevealPhase.REVEAL
                scope.launch {
                    delay(800)   // let the focus-pull play before navigating
                    onFinished()
                }
            },
    ) {

        // ── 1. Card behind, blurred (focus-pulls sharp on tap) ─────────────────
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

        // ── 4. Mythic glow ────────────────────────────────────────────────────
        if (isMythic && contentAlpha > 0f) {
            MythicGlow(modifier = Modifier.align(Alignment.Center).alpha(contentAlpha))
        }

        // ── 5. Main block (flower + text), shifted up for balance ─────────────
        if (contentAlpha > 0f) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.Center)
                    .offset(y = (-104).dp)
                    .alpha(contentAlpha)
                    .padding(horizontal = 28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                BloomLottie(
                    rarity    = rarity,
                    replayKey = ascent.id,
                    onBloomed = { bloomDone = true },
                )

                // Info block — appears all at once: unlocked + peak + pills
                StepText(visible = showInfo) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Text(
                            text       = stringResource(R.string.capture_reveal_unlocked),
                            color      = Color(0xFFF5C842),
                            fontSize   = 13.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 0.18.em,
                            textAlign  = TextAlign.Center,
                        )
                        Text(
                            text       = ascent.peak.name.uppercase(),
                            color      = Color.White,
                            fontSize   = 30.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = (-0.02).em,
                            lineHeight = 33.sp,
                            textAlign  = TextAlign.Center,
                        )
                        androidx.compose.foundation.layout.Row(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment     = Alignment.CenterVertically,
                        ) {
                            RevealPill(accent = rarity.color, leading = "✿", label = rarity.label)
                            RevealPill(accent = Color.White,   leading = "",  label = "${ascent.peak.altitudeM} m")
                        }
                    }
                }
            }
        }

        // ── 6. EP reward — anchored near the bottom (never overlaps 2-line names)
        if (contentAlpha > 0f && epStarted) {
            EpReward(
                text      = stringResource(R.string.capture_reveal_ep, epCount.value.roundToInt()),
                glowColor = if (isMythic) Color(0xFFFFD700) else rarity.color,
                pop       = epPop.value,
                celebrate = epDone,
                modifier  = Modifier
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding()
                    .padding(bottom = 18.dp)
                    .alpha(contentAlpha),
            )
        }

        // ── 6. Mythic particles ───────────────────────────────────────────────
        if (isMythic && contentAlpha > 0f) {
            MythicParticles(replayKey = ascent.id, modifier = Modifier.fillMaxSize().alpha(contentAlpha))
        }
    }
}

// EP reward — number with a soft rarity-colored glow + a gentle sparkle burst
// when it lands (Duolingo-style celebration), tinted with the rarity color.
@Composable
private fun EpReward(
    text:      String,
    glowColor: Color,
    pop:       Float,
    celebrate: Boolean,
    modifier:  Modifier = Modifier,
) {
    // Soft pulsing glow behind the number (rarity colored)
    val glow by rememberInfiniteTransition(label = "ep_glow").animateFloat(
        initialValue  = 0.22f,
        targetValue   = 0.45f,
        animationSpec = infiniteRepeatable(tween(1100), RepeatMode.Reverse),
        label         = "ep_glow_alpha",
    )

    // One-shot sparkle burst when EP lands
    val sparks = remember(celebrate) { List(12) { Animatable(0f) } }
    LaunchedEffect(celebrate) {
        if (celebrate) {
            sparks.forEachIndexed { i, a ->
                launch {
                    delay(i * 35L)
                    a.animateTo(1f, tween(850, easing = LinearOutSlowInEasing))
                }
            }
        }
    }

    Box(
        modifier         = modifier.size(170.dp),
        contentAlignment = Alignment.Center,
    ) {
        // Glow disc
        Box(
            modifier = Modifier
                .size(150.dp)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(glowColor.copy(alpha = glow), Color.Transparent),
                    ),
                    shape = CircleShape,
                ),
        )

        // Sparkles — bright burst that fully fades out (no frozen dots)
        if (celebrate) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val cx = size.width / 2f
                val cy = size.height / 2f
                sparks.forEachIndexed { i, a ->
                    val p     = a.value
                    if (p >= 1f) return@forEachIndexed   // fully gone
                    val angle = Math.toRadians(i * (360.0 / sparks.size) - 90.0)
                    val dist  = 78.dp.toPx() * p
                    val alpha = (1f - p).coerceIn(0f, 1f)   // → 0 at the end
                    val cxp   = cx + cos(angle).toFloat() * dist
                    val cyp   = cy + sin(angle).toFloat() * dist
                    drawCircle(
                        color  = glowColor.copy(alpha = alpha * 0.9f),
                        radius = 7.dp.toPx() * (1f - p * 0.35f),
                        center = Offset(cxp, cyp),
                    )
                    drawCircle(
                        color  = Color.White.copy(alpha = alpha),
                        radius = 3.dp.toPx() * (1f - p * 0.4f),
                        center = Offset(cxp, cyp),
                    )
                }
            }
        }

        // The EP number — white
        Text(
            text       = text,
            color      = Color.White,
            fontSize   = 20.sp,
            fontWeight = FontWeight.Black,
            textAlign  = TextAlign.Center,
            modifier   = Modifier.graphicsLayer {
                scaleX = pop
                scaleY = pop
            },
        )
    }
}

// Translucent rounded pill — "[leading] label" — matching the cards' style.
@Composable
private fun RevealPill(accent: Color, leading: String, label: String) {
    androidx.compose.foundation.layout.Row(
        modifier = Modifier
            .background(
                color = accent.copy(alpha = 0.20f),
                shape = androidx.compose.foundation.shape.RoundedCornerShape(100),
            )
            .border(
                width = 1.dp,
                color = accent.copy(alpha = 0.55f),
                shape = androidx.compose.foundation.shape.RoundedCornerShape(100),
            )
            .padding(horizontal = 16.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        if (leading.isNotEmpty()) {
            Text(text = leading, color = accent, fontSize = 15.sp)
        }
        Text(
            text       = label,
            color      = accent,
            fontSize   = 15.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

// Fades + slides a step element in when `visible` flips true.
@Composable
private fun StepText(visible: Boolean, content: @Composable () -> Unit) {
    val alpha by animateFloatAsState(
        targetValue   = if (visible) 1f else 0f,
        animationSpec = tween(durationMillis = 400),
        label         = "step_alpha",
    )
    val offsetY by animateFloatAsState(
        targetValue   = if (visible) 0f else 10f,
        animationSpec = tween(durationMillis = 400),
        label         = "step_offset",
    )
    if (alpha > 0f) {
        Box(modifier = Modifier.alpha(alpha).graphicsLayer { translationY = offsetY }) {
            content()
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
        animationSpec = infiniteRepeatable(tween(durationMillis = 900), RepeatMode.Reverse),
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
private fun MythicParticles(replayKey: String, modifier: Modifier = Modifier) {
    val particles = remember(replayKey) { List(8) { Animatable(0f) } }
    LaunchedEffect(replayKey) {
        particles.forEachIndexed { i, anim ->
            launch {
                delay(i * 90L)
                anim.animateTo(targetValue = 1f, animationSpec = tween(durationMillis = 750))
            }
        }
    }
    Canvas(modifier = modifier) {
        val cx = size.width / 2f
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
                center = Offset(cx + cos(angle).toFloat() * dist, cy + sin(angle).toFloat() * dist),
            )
            drawCircle(
                color  = Color.White.copy(alpha = alpha * 0.6f),
                radius = 3.dp.toPx() * (1f - progress),
                center = Offset(cx + cos(angle).toFloat() * dist * 0.6f, cy + sin(angle).toFloat() * dist * 0.6f),
            )
        }
    }
}

// ── Lottie bloom animation ─────────────────────────────────────────────────────
// Grows once, then stays "alive" with a subtle breathing + sway.

private const val BREATHE_SCALE = 0.035f
private const val BREATHE_MS    = 2600
private const val SWAY_DEGREES  = 1.5f
private const val SWAY_MS       = 3400

@Composable
private fun BloomLottie(
    rarity:    RarityInfo,
    replayKey: String = "",
    onBloomed: () -> Unit = {},
    modifier:  Modifier = Modifier,
) {
    val compositionResult = rememberLottieComposition(
        LottieCompositionSpec.RawRes(R.raw.flower_bloom),
    )
    val composition = compositionResult.value

    val progress by animateLottieCompositionAsState(
        composition   = composition,
        iterations    = 1,
        speed         = GROW_SPEED,
        restartOnPlay = false,
    )
    val bloomed = progress >= 0.99f
    LaunchedEffect(bloomed) { if (bloomed) onBloomed() }

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

    // Tint only petals (Group 8) + center (Group 7); stem/leaves stay natural.
    val centerColor = remember(rarity.color) {
        rarity.color.copy(
            red   = (rarity.color.red   * 0.6f).coerceIn(0f, 1f),
            green = (rarity.color.green * 0.6f).coerceIn(0f, 1f),
            blue  = (rarity.color.blue  * 0.6f).coerceIn(0f, 1f),
        )
    }
    val dynamicProperties = rememberLottieDynamicProperties(
        rememberLottieDynamicProperty(
            property = LottieProperty.COLOR,
            value    = rarity.color.toArgb(),
            keyPath  = arrayOf("Pre-comp 1", "Layer 2", "Group 8", "Fill 1"),
        ),
        rememberLottieDynamicProperty(
            property = LottieProperty.COLOR,
            value    = centerColor.toArgb(),
            keyPath  = arrayOf("Pre-comp 1", "Layer 2", "Group 7", "Fill 1"),
        ),
    )

    Box(
        modifier         = modifier.size(260.dp),
        contentAlignment = Alignment.Center,
    ) {
        // Soft light halo so petals/stem/leaves all pop (spotlight effect).
        // Only shown once the flower has started blooming, to avoid an empty glow.
        if (composition != null && progress > 0.02f) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        brush = Brush.radialGradient(
                            colors = listOf(
                                Color.White.copy(alpha = 0.42f),
                                Color.White.copy(alpha = 0.18f),
                                Color.Transparent,
                            ),
                        ),
                        shape = CircleShape,
                    ),
            )
        }

        when {
            composition != null -> LottieAnimation(
                composition       = composition,
                progress          = { progress },
                dynamicProperties = dynamicProperties,
                modifier          = Modifier
                    .size(220.dp)
                    .graphicsLayer {
                        scaleX          = aliveScale
                        scaleY          = aliveScale
                        rotationZ       = aliveSway
                        transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0.5f, 0.85f)
                    },
            )
            // Only fall back to the Canvas flower on a genuine load FAILURE —
            // while loading we render nothing (avoids the green/white dot flicker).
            compositionResult.isFailure -> CaptureFlowerFallback(color = rarity.color, replayKey = replayKey)
        }
    }
}

// ── Canvas fallback ─────────────────────────────────────────────────────────────

@Composable
private fun CaptureFlowerFallback(color: Color, replayKey: String) {
    val bloom = remember(replayKey) { Animatable(0f) }
    LaunchedEffect(replayKey) {
        bloom.animateTo(targetValue = 1f, animationSpec = tween(durationMillis = 900, easing = EaseOutBack))
    }
    Canvas(modifier = Modifier.size(220.dp)) {
        val center        = this.center
        val petalRadius   = size.minDimension * 0.18f
        val petalDistance = size.minDimension * 0.16f * bloom.value
        repeat(8) { index ->
            val angle = Math.toRadians((index * 45.0) - 90.0)
            val petalCenter = Offset(
                x = center.x + cos(angle).toFloat() * petalDistance,
                y = center.y + sin(angle).toFloat() * petalDistance,
            )
            drawCircle(color = color.copy(alpha = 0.72f), radius = petalRadius * bloom.value.coerceAtLeast(0.12f), center = petalCenter)
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

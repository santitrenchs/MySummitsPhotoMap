package com.peakadex.app.feature.newascent

import android.view.HapticFeedbackConstants
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
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
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
import com.peakadex.app.feature.cards.CardFront
import com.peakadex.app.feature.cards.CardRevealState
import com.peakadex.app.feature.cards.ElevationProfileCanvas
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin

// ── Timeline (ms) — card-grounded cinematic reveal ──────────────────────────────
// The real card floats over the feed under an opaque cover. Sequence: flower blooms
// → "PEAK CAPTURED!" + peak name appear → rarity cell pops → EP rolls up → (mythic)
// gold petals + MYTHIC pill. ~2s after it finishes the cover/scene dissolve
// (focus-pull) to the real card automatically, then hand off to the feed.
private const val GROW_SPEED  = 0.85f   // flower bloom speed (file is 2s → ~2.35s)
private const val T_EP        = 2300L   // EP starts this long after the bloom (lets the rarity pop breathe)
private const val EP_COUNT_MS = 1300L   // EP roll-up duration
private const val PHOTO_BLUR  = 16      // dp — photo blur during BUILD

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
    val view  = LocalView.current

    // Card entrance — scale-in + fade, as if the card is dealt onto the table.
    var entered by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { entered = true }
    val cardScale by animateFloatAsState(
        targetValue   = if (entered) 1f else 0.88f,
        animationSpec = tween(durationMillis = 440, easing = EaseOutBack),
        label         = "card_scale",
    )
    val cardAlpha by animateFloatAsState(
        targetValue   = if (entered) 1f else 0f,
        animationSpec = tween(durationMillis = 240),
        label         = "card_alpha",
    )

    // Bloom completion is reported by BloomLottie; EP only rolls once the flower
    // is fully open (with a beat after).
    var bloomDone by remember { mutableStateOf(false) }
    // Rarity highlight: when the flower finishes blooming, the rarity stat-band cell
    // pops big → card size to call it out.
    val rarityScale = remember { Animatable(1f) }
    LaunchedEffect(bloomDone) {
        if (bloomDone) {
            delay(700)                                   // let "PEAK CAPTURED!" land first
            view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
            rarityScale.animateTo(2.1f, tween(durationMillis = 300, easing = EaseOutBack))
            delay(1400)                                  // hold big a bit longer so it's clearly noticed
            rarityScale.animateTo(1.14f, tween(180))
            rarityScale.animateTo(1f, spring(dampingRatio = 0.5f, stiffness = 320f))
        }
    }

    // EP roll-up — the card's own EP cell counts 0 → N. While rolling it scales up
    // big, then settles back to its normal card size (with a pop) on land.
    val epCount = remember { Animatable(0f) }
    var epStarted by remember { mutableStateOf(false) }
    var epDone    by remember { mutableStateOf(false) }
    val epScale   = remember { Animatable(1f) }
    LaunchedEffect(bloomDone) {
        if (bloomDone && !epStarted) {
            delay(T_EP)
            epStarted = true
            launch { epScale.animateTo(1.9f, tween(durationMillis = 220, easing = LinearOutSlowInEasing)) }
            epCount.animateTo(rarity.ep.toFloat(), tween(EP_COUNT_MS.toInt(), easing = LinearOutSlowInEasing))
            epDone = true
        }
    }
    // On land: shrink the number back down into the card with a small pop + haptic.
    LaunchedEffect(epDone) {
        if (epDone) {
            view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
            epScale.animateTo(1.12f, tween(140))
            epScale.animateTo(1f, spring(dampingRatio = 0.42f, stiffness = 340f))
        }
    }

    // Mythic beat — fires AFTER the EP lands (only for mythic): petals turn gold,
    // the MYTHIC pill pops in top-left, plus a gold glow + particle burst.
    var mythicBeat by remember { mutableStateOf(false) }
    val pillScale  = remember { Animatable(1f) }   // MYTHIC pill big → small pop
    LaunchedEffect(epDone) {
        if (epDone && isMythic && !mythicBeat) {
            delay(400)
            mythicBeat = true
            view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
            // Pill pops big → settle (slower, more noticeable).
            pillScale.snapTo(1.7f)
            pillScale.animateTo(1.14f, tween(280))
            pillScale.animateTo(1f, spring(dampingRatio = 0.5f, stiffness = 220f))
        }
    }
    // Petal color: rarity → gold on the mythic beat (slower tint).
    val petalColor by androidx.compose.animation.animateColorAsState(
        targetValue   = if (mythicBeat) Color(0xFFFFD700) else rarity.color,
        animationSpec = tween(durationMillis = 1000),
        label         = "petal_color",
    )

    // Focus-pull on tap: photo blur 16 → 0 and the dark scrim dissolves.
    val blurRadius by animateDpAsState(
        targetValue   = if (phase == RevealPhase.BUILD) PHOTO_BLUR.dp else 0.dp,
        animationSpec = tween(durationMillis = 750),
        label         = "photo_blur",
    )
    // Light-gray cover over the photo (the reveal "scene" plays on it); dissolves
    // on tap to reveal the real photo + peak name underneath.
    val coverAlpha by animateFloatAsState(
        targetValue   = if (phase == RevealPhase.BUILD) 1f else 0f,
        animationSpec = tween(durationMillis = 750),
        label         = "photo_cover",
    )
    // Opaque backdrop (app feed color) covers the live feed while it settles to
    // Mine + scrolls to the new card behind us; dissolves on tap to reveal the
    // settled feed — so the user never sees the stale last-viewed card flash.
    val backdropAlpha by animateFloatAsState(
        targetValue   = if (phase == RevealPhase.BUILD) 1f else 0f,
        animationSpec = tween(durationMillis = 750),
        label         = "backdrop",
    )
    val fxAlpha by animateFloatAsState(
        targetValue   = if (phase == RevealPhase.BUILD) 1f else 0f,
        animationSpec = tween(durationMillis = 450),
        label         = "fx_alpha",
    )
    // Info (Peak captured + name + altitude + profile) springs in after the bloom.
    val infoAppear by animateFloatAsState(
        targetValue   = if (bloomDone) 1f else 0f,
        animationSpec = spring(dampingRatio = 0.55f, stiffness = 260f),
        label         = "info_appear",
    )

    // Reveal: dissolve the cover/scene to show the real card, then hand off to the feed.
    val doReveal: () -> Unit = {
        if (phase == RevealPhase.BUILD) {
            phase = RevealPhase.REVEAL
            view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
            scope.launch {
                // If reveal is triggered before the EP finished rolling, fast-forward it.
                if (!epDone) {
                    epStarted = true
                    epCount.animateTo(rarity.ep.toFloat(), tween(160))
                    epDone = true
                }
                delay(800)   // let the focus-pull play before handing off to the feed
                onFinished()
            }
        }
    }

    // Auto-reveal 1s after the whole sequence finishes (mythic waits for its beat).
    LaunchedEffect(epDone) {
        if (epDone) {
            if (isMythic) delay(2200)   // mythic beat: gold tint + pill + particles
            delay(2000)                 // 2s after the action ends
            doReveal()
        }
    }

    Box(
        modifier = modifier.fillMaxSize(),
    ) {
        // Opaque backdrop hiding the still-settling feed; dissolves on tap.
        if (backdropAlpha > 0f) {
            Box(Modifier.fillMaxSize().background(Color.White.copy(alpha = backdropAlpha)))
        }

        // The real card, centered, floating over the feed with its own shadow.
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .align(Alignment.Center)
                .graphicsLayer {
                    scaleX = cardScale
                    scaleY = cardScale
                    alpha  = cardAlpha
                }
                .shadow(elevation = 22.dp, shape = RoundedCornerShape(28.dp), clip = false)
                .clip(RoundedCornerShape(28.dp))
                .background(Color.White),
        ) {
            CardFront(
                ascent       = ascent,
                rarity       = rarity,
                onEditClick  = {},
                onShareClick = {},
                reveal = CardRevealState(
                    photoBlur   = blurRadius,
                    photoCover  = coverAlpha,
                    rarityScale = rarityScale.value,
                    epDisplay   = epCount.value.roundToInt(),
                    epScale    = epScale.value,
                    photoOverlay = {
                        BoxWithConstraints(Modifier.fillMaxSize()) {
                            val flowerDp = maxHeight * 0.65f
                            val epicSize = (flowerDp.value * 0.105f).sp

                            // Upper group: flower + "PEAK CAPTURED!" right beneath it
                            // (small gap so the headline hugs the flower). The peak name
                            // sits lower, near the profile, so they breathe apart.
                            Column(
                                modifier            = Modifier
                                    .align(Alignment.Center)
                                    .fillMaxWidth()
                                    .offset(y = -(maxHeight * 0.05f)),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                Box(
                                    modifier         = Modifier.size(flowerDp).alpha(fxAlpha),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    if (isMythic && mythicBeat) MythicGlow(Modifier.fillMaxSize())
                                    BloomLottie(
                                        rarity     = rarity,
                                        replayKey  = ascent.id,
                                        petalColor = petalColor,
                                        onBloomed  = { bloomDone = true },
                                        modifier   = Modifier.fillMaxSize(),
                                    )
                                }
                                // The daisy art sits in the top third of its frame (the
                                // lower part is the hidden stem area), so the flower Box
                                // has a large empty bottom. Pull the headline up into that
                                // empty space so it hugs the actual flower.
                                Text(
                                    text          = stringResource(R.string.capture_reveal_captured).uppercase(),
                                    color         = Color(0xFF111827),
                                    fontSize      = epicSize,
                                    fontWeight    = FontWeight.Black,
                                    letterSpacing = 0.08.em,
                                    textAlign     = TextAlign.Center,
                                    style         = TextStyle(shadow = Shadow(color = rarity.color.copy(alpha = 0.4f), blurRadius = 16f)),
                                    modifier      = Modifier
                                        .offset(y = -(flowerDp * 0.40f))
                                        .alpha((infoAppear * fxAlpha).coerceIn(0f, 1f)),
                                )
                            }

                            // Peak name + altitude — lower, close to the elevation profile.
                            // Same size as the front card, dark so they read on the gray cover.
                            Column(
                                modifier            = Modifier
                                    .align(Alignment.BottomCenter)
                                    .padding(bottom = 52.dp)
                                    .alpha((infoAppear * fxAlpha).coerceIn(0f, 1f)),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                Text(ascent.peak.name, fontSize = 22.sp, fontWeight = FontWeight.Black, color = rarity.color,
                                    letterSpacing = (-0.04).em, maxLines = 1, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center)
                                Text("${ascent.peak.altitudeM} m", fontSize = 28.sp, fontWeight = FontWeight.Black, color = rarity.color,
                                    letterSpacing = (-0.04).em, textAlign = TextAlign.Center)
                            }

                            // Mythic particles burst from the flower — only on the beat.
                            if (isMythic && mythicBeat) {
                                MythicParticles(
                                    replayKey = ascent.id,
                                    modifier  = Modifier.fillMaxSize().alpha(fxAlpha),
                                )
                            }

                            // Elevation profile — rarity-tinted, flush to the bottom of the image.
                            ElevationProfileCanvas(
                                peakId    = ascent.peak.id,
                                profile   = ascent.peak.elevationProfile,
                                altitudeM = ascent.peak.altitudeM,
                                lineColor = rarity.color,
                                modifier  = Modifier
                                    .align(Alignment.BottomCenter)
                                    .fillMaxWidth()
                                    .height(40.dp)
                                    .alpha((infoAppear * fxAlpha).coerceIn(0f, 1f)),
                            )

                            // MYTHIC pill — top-left, matches the card badge; pops big →
                            // small on the beat (like the cairn / EP).
                            if (isMythic && mythicBeat) {
                                MythicPill(
                                    modifier = Modifier
                                        .align(Alignment.TopStart)
                                        .padding(12.dp)
                                        .graphicsLayer {
                                            scaleX = pillScale.value; scaleY = pillScale.value
                                            transformOrigin = TransformOrigin(0f, 0f)
                                            alpha  = fxAlpha
                                        },
                                )
                            }
                        }
                    },
                ),
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
        animationSpec = infiniteRepeatable(tween(durationMillis = 900), RepeatMode.Reverse),
        label = "glow_alpha",
    )
    Box(
        modifier = modifier
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
                delay(i * 120L)
                anim.animateTo(targetValue = 1f, animationSpec = tween(durationMillis = 1100))
            }
        }
    }
    Canvas(modifier = modifier) {
        val cx = size.width / 2f
        val cy = size.height / 2f
        val reach = size.minDimension * 0.42f
        particles.forEachIndexed { i, anim ->
            val progress = anim.value
            val angle    = Math.toRadians(i * 45.0 - 90.0)
            val dist     = reach * progress
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

// MYTHIC pill — mirrors the card's gold mythic badge. Shown over the cover at the
// mythic beat (the real card badge sits underneath and matches it after reveal).
@Composable
private fun MythicPill(modifier: Modifier = Modifier) {
    Text(
        text          = stringResource(R.string.card_mythic),
        color         = Color.White,
        fontSize      = 10.sp,
        fontWeight    = FontWeight.Black,
        letterSpacing = 0.12.em,
        modifier      = modifier
            .shadow(8.dp, RoundedCornerShape(percent = 50), clip = false,
                ambientColor = Color(0x59EAB308), spotColor = Color(0x59EAB308))
            .background(Color(0xF2EAB308), RoundedCornerShape(percent = 50))
            .padding(horizontal = 10.dp, vertical = 6.dp),
    )
}

// ── Lottie bloom animation ─────────────────────────────────────────────────────
// Grows once, then stays "alive" with a subtle breathing + sway.

private const val BREATHE_SCALE = 0.035f
private const val BREATHE_MS    = 2600
private const val SWAY_DEGREES  = 1.5f
private const val SWAY_MS       = 3400

@Composable
private fun BloomLottie(
    rarity:     RarityInfo,
    replayKey:  String = "",
    petalColor: Color = rarity.color,
    onBloomed:  () -> Unit = {},
    modifier:   Modifier = Modifier,
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

    // Daisy tinting (Spanish node names): petals = rarity colour, center = a darker
    // shade of it (kept distinct). Petal black outlines stay. petalColor animates to
    // gold on the mythic beat; the center follows in a darker gold.
    val centerColor = petalColor.copy(
        red   = (petalColor.red   * 0.55f).coerceIn(0f, 1f),
        green = (petalColor.green * 0.55f).coerceIn(0f, 1f),
        blue  = (petalColor.blue  * 0.55f).coerceIn(0f, 1f),
    )
    val dynamicProperties = rememberLottieDynamicProperties(
        // Petals — only layers with a "Grupo 2" (the petal shape) match.
        rememberLottieDynamicProperty(
            property = LottieProperty.COLOR,
            value    = petalColor.toArgb(),
            keyPath  = arrayOf("**", "Grupo 2", "Relleno 1"),
        ),
        // Center disc — fill + stroke, darker shade.
        rememberLottieDynamicProperty(
            property = LottieProperty.COLOR,
            value    = centerColor.toArgb(),
            keyPath  = arrayOf("flor", "Grupo 1", "Relleno 1"),
        ),
        rememberLottieDynamicProperty(
            property = LottieProperty.STROKE_COLOR,
            value    = centerColor.toArgb(),
            keyPath  = arrayOf("flor", "Grupo 1", "Trazo 1"),
        ),
    )

    Box(
        modifier         = modifier,
        contentAlignment = Alignment.Center,
    ) {
        // Soft light halo so petals/stem/leaves pop against the blurred photo.
        // Only shown once the flower has started blooming, to avoid an empty glow.
        if (composition != null && progress > 0.02f) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        brush = Brush.radialGradient(
                            colors = listOf(
                                Color.White.copy(alpha = 0.30f),
                                Color.White.copy(alpha = 0.12f),
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
                    .fillMaxSize(0.85f)
                    .graphicsLayer {
                        scaleX          = aliveScale
                        scaleY          = aliveScale
                        rotationZ       = aliveSway
                        transformOrigin = TransformOrigin(0.5f, 0.85f)
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
    Canvas(modifier = Modifier.fillMaxSize(0.85f)) {
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

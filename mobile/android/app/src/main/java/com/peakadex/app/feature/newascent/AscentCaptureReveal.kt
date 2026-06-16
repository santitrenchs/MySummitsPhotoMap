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
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.airbnb.lottie.LottieProperty
import com.airbnb.lottie.compose.LottieAnimation
import com.airbnb.lottie.compose.LottieCompositionSpec
import com.airbnb.lottie.compose.LottieConstants
import com.airbnb.lottie.compose.animateLottieCompositionAsState
import com.airbnb.lottie.compose.rememberLottieComposition
import com.airbnb.lottie.compose.rememberLottieDynamicProperties
import com.airbnb.lottie.compose.rememberLottieDynamicProperty
import com.peakadex.app.R
import com.peakadex.app.core.model.Ascent
import com.peakadex.app.core.ui.PeakadexLogo
import com.peakadex.app.core.ui.RarityInfo
import com.peakadex.app.feature.cards.CardFront
import com.peakadex.app.feature.cards.CardRevealState
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin

// ── Timeline (ms) — card-grounded cinematic reveal ──────────────────────────────
// The real card floats over the live feed (no full-screen scrim). Only the photo
// is blurred. A flower blooms inside the photo, then the EP counter rolls up in
// the card's own stat band. On tap, the photo "focus-pulls" sharp and the flower
// dissolves, leaving the finished card.
private const val GROW_SPEED  = 0.85f   // flower bloom speed (file is 2s → ~2.35s)
private const val T_EP        = 2100L   // EP starts this long after the bloom (lets the rarity pop breathe)
private const val EP_COUNT_MS = 900L    // EP roll-up duration
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
            view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
            rarityScale.animateTo(2.1f, tween(durationMillis = 300, easing = EaseOutBack))
            delay(950)                                   // hold big so it's clearly noticed
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

    // Mythic beat — fires AFTER the EP lands (only for mythic). Petals turn gold,
    // the MYTHIC pill appears top-left, and the cairn grows in next to the EP.
    var mythicBeat by remember { mutableStateOf(false) }
    val cairnScale = remember { Animatable(1f) }
    LaunchedEffect(epDone) {
        if (epDone && isMythic && !mythicBeat) {
            delay(300)
            mythicBeat = true
            view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
            cairnScale.snapTo(1.9f)
            cairnScale.animateTo(1.12f, tween(160))
            cairnScale.animateTo(1f, spring(dampingRatio = 0.42f, stiffness = 340f))
        }
    }
    // Petal color: rarity → gold on the mythic beat.
    val petalColor by androidx.compose.animation.animateColorAsState(
        targetValue   = if (mythicBeat) Color(0xFFFFD700) else rarity.color,
        animationSpec = tween(durationMillis = 600),
        label         = "petal_color",
    )
    // MYTHIC pill appearance (scale + fade) on the beat.
    val pillAppear by animateFloatAsState(
        targetValue   = if (mythicBeat) 1f else 0f,
        animationSpec = tween(durationMillis = 320),
        label         = "pill_appear",
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

    Box(
        modifier = modifier
            .fillMaxSize()
            .clickable(
                enabled           = phase == RevealPhase.BUILD,
                indication        = null,
                interactionSource = remember { MutableInteractionSource() },
            ) {
                phase = RevealPhase.REVEAL
                view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                scope.launch {
                    // If the user taps before the EP finished rolling, fast-forward
                    // it so the reward number always lands.
                    if (!epDone) {
                        epStarted = true
                        epCount.animateTo(rarity.ep.toFloat(), tween(160))
                        epDone = true
                    }
                    delay(800)   // let the focus-pull play before handing off to the feed
                    onFinished()
                }
            },
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
                    showCairn  = mythicBeat,            // cairn appears at the mythic beat
                    cairnScale = cairnScale.value,
                    photoOverlay = {
                        BoxWithConstraints(Modifier.fillMaxSize()) {
                            // Raise the whole scene ~10% to leave room for the headline.
                            val raise = maxHeight * 0.10f

                            // Mountaineer — bottom-left, fit by height, raised 10%.
                            // 15% smaller than before (same bottom anchor → more top room).
                            MountaineerLottie(
                                modifier = Modifier
                                    .align(Alignment.BottomStart)
                                    .padding(start = 6.dp)
                                    .offset(y = -raise)
                                    .fillMaxHeight(0.73f)
                                    .aspectRatio(884f / 1796f)
                                    .alpha(fxAlpha),
                            )
                            // Flower — to the RIGHT of the mountaineer, growing up to
                            // ~his waist. Petals turn gold on the mythic beat.
                            BloomLottie(
                                rarity     = rarity,
                                replayKey  = ascent.id,
                                petalColor = petalColor,
                                onBloomed  = { bloomDone = true },
                                modifier   = Modifier
                                    .align(Alignment.BottomEnd)
                                    .padding(end = 2.dp)
                                    .offset(y = -raise)
                                    .fillMaxHeight(0.39f)
                                    .aspectRatio(1f)
                                    .alpha(fxAlpha),
                            )
                            // Mythic glow + particles behind the flower — only on the beat.
                            if (isMythic && mythicBeat) {
                                Box(
                                    modifier = Modifier
                                        .align(Alignment.BottomEnd)
                                        .offset(y = -raise)
                                        .fillMaxHeight(0.39f)
                                        .aspectRatio(1f)
                                        .alpha(fxAlpha),
                                ) { MythicGlow(Modifier.fillMaxSize()) }
                                MythicParticles(
                                    replayKey = ascent.id,
                                    modifier  = Modifier.fillMaxSize().alpha(fxAlpha),
                                )
                            }

                            // Peakadex wordmark (same as the top bar) — branding moment
                            // below the scene. The rarity is highlighted via its cell pop.
                            BrandHeadline(
                                visible  = bloomDone,
                                fade     = fxAlpha,
                                modifier = Modifier
                                    .align(Alignment.BottomCenter)
                                    .padding(bottom = 26.dp),
                            )

                            // MYTHIC pill — top-left, matches the card badge; appears on the beat.
                            if (isMythic) {
                                MythicPill(
                                    modifier = Modifier
                                        .align(Alignment.TopStart)
                                        .padding(12.dp)
                                        .graphicsLayer {
                                            val s = 0.6f + 0.4f * pillAppear
                                            scaleX = s; scaleY = s
                                            alpha  = pillAppear * fxAlpha
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
                delay(i * 90L)
                anim.animateTo(targetValue = 1f, animationSpec = tween(durationMillis = 750))
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

// Branding moment — the Peakadex wordmark (same as the top bar) springs in once
// the flower finishes blooming, and fades out with the rest of the scene on reveal.
@Composable
private fun BrandHeadline(
    visible:  Boolean,
    fade:     Float,
    modifier: Modifier = Modifier,
) {
    val appear by animateFloatAsState(
        targetValue   = if (visible) 1f else 0f,
        animationSpec = spring(dampingRatio = 0.55f, stiffness = 260f),
        label         = "brand_appear",
    )
    PeakadexLogo(
        height   = 32.dp,
        modifier = modifier.graphicsLayer {
            val s = 0.82f + 0.18f * appear
            scaleX = s; scaleY = s
            alpha  = (appear * fade).coerceIn(0f, 1f)
        },
    )
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

// ── Mountaineer (idle loop) ────────────────────────────────────────────────────
// Plays its idle loop forever behind/beside the blooming flower. No tinting —
// keeps its own colors. Default styles only (plain Lottie JSON).

@Composable
private fun MountaineerLottie(modifier: Modifier = Modifier) {
    val composition = rememberLottieComposition(LottieCompositionSpec.RawRes(R.raw.mountaineer)).value
    val progress by animateLottieCompositionAsState(
        composition   = composition,
        iterations    = LottieConstants.IterateForever,
        speed         = 1f,
        restartOnPlay = false,
    )
    if (composition != null) {
        LottieAnimation(composition = composition, progress = { progress }, modifier = modifier)
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

    // Tint only petals (Group 8) + center (Group 7); stem/leaves stay natural.
    // petalColor animates to gold on the mythic beat.
    val centerColor = petalColor.copy(
        red   = (petalColor.red   * 0.6f).coerceIn(0f, 1f),
        green = (petalColor.green * 0.6f).coerceIn(0f, 1f),
        blue  = (petalColor.blue  * 0.6f).coerceIn(0f, 1f),
    )
    val dynamicProperties = rememberLottieDynamicProperties(
        rememberLottieDynamicProperty(
            property = LottieProperty.COLOR,
            value    = petalColor.toArgb(),
            keyPath  = arrayOf("Pre-comp 1", "Layer 2", "Group 8", "Fill 1"),
        ),
        rememberLottieDynamicProperty(
            property = LottieProperty.COLOR,
            value    = centerColor.toArgb(),
            keyPath  = arrayOf("Pre-comp 1", "Layer 2", "Group 7", "Fill 1"),
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

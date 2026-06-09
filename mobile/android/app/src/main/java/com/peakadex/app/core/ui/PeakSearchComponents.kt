package com.peakadex.app.core.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.peakadex.app.core.ui.theme.PeakBlueActive
import com.peakadex.app.core.ui.theme.PeakMuted
import com.peakadex.app.core.ui.theme.PeakSlate
import com.peakadex.app.core.ui.theme.PeakSubtle
import com.peakadex.app.core.ui.theme.PeakTextHeadline

// ── Shared search + filter components ──────────────────────────────────────────
//
// Single source of truth for the search input and the filter button used across
// Atlas, Cards (Logbook), Friends/Cordadas and Profile. Unified spec:
//   • Material 3 aligned: pill shape, filled white surface, subtle 2dp elevation.
//   • iOS gotcha compliant: input + placeholder text are 16sp (no auto-zoom).
//   • 48dp height — Material minimum touch target.
//
// Do NOT re-create per-screen search/filter styling. Use these everywhere.

private const val FIELD_HEIGHT = 48
private val FIELD_SHAPE = RoundedCornerShape(24.dp)

/**
 * Unified search input. Apply layout sizing (e.g. weight, fillMaxWidth,
 * bringIntoViewRequester) via [modifier].
 *
 * @param onClear custom trailing-button action. When null, the trailing button
 *   clears the text. The trailing button is shown whenever [showClear] is true.
 */
@Composable
fun PeakSearchField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    showClear: Boolean = value.isNotEmpty(),
    onClear: (() -> Unit)? = null,
    enabled: Boolean = true,
    textFieldModifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .height(FIELD_HEIGHT.dp)
            .shadow(2.dp, FIELD_SHAPE)
            .background(Color.White, FIELD_SHAPE)
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector        = PeakSearchIcon,
            contentDescription = null,
            tint               = PeakMuted,
            modifier           = Modifier.size(18.dp),
        )
        Spacer(Modifier.width(8.dp))
        BasicTextField(
            value           = value,
            onValueChange   = onValueChange,
            singleLine      = true,
            enabled         = enabled,
            textStyle       = TextStyle(fontSize = 16.sp, color = PeakTextHeadline),
            cursorBrush     = SolidColor(PeakBlueActive),
            keyboardOptions = keyboardOptions,
            keyboardActions = keyboardActions,
            modifier        = Modifier.weight(1f).then(textFieldModifier),
            decorationBox   = { inner ->
                if (value.isEmpty()) {
                    Text(placeholder, fontSize = 16.sp, color = PeakSubtle)
                }
                inner()
            },
        )
        if (showClear) {
            Spacer(Modifier.width(6.dp))
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(CircleShape)
                    .clickable(
                        indication = null,
                        interactionSource = remember { MutableInteractionSource() },
                    ) { onClear?.invoke() ?: onValueChange("") },
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    modifier = Modifier
                        .size(18.dp)
                        .clip(CircleShape)
                        .background(PeakMuted.copy(alpha = 0.18f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(PeakCloseIcon, null, Modifier.size(10.dp), tint = PeakMuted)
                }
            }
        }
    }
}

/**
 * Unified filter button (funnel icon + "Filtros" label).
 *
 * @param active dark (selected) appearance — pass `filtersOpen || hasActiveFilters`.
 * @param showBadge blue dot — pass `hasActiveFilters && !filtersOpen`.
 */
@Composable
fun PeakFilterButton(
    label: String,
    active: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    showBadge: Boolean = false,
) {
    Box(modifier = modifier) {
        Row(
            modifier = Modifier
                .height(FIELD_HEIGHT.dp)
                .shadow(2.dp, FIELD_SHAPE)
                .background(if (active) PeakSlate else Color.White, FIELD_SHAPE)
                .clickable(onClick = onClick)
                .padding(horizontal = 16.dp),
            verticalAlignment     = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(
                imageVector        = PeakFiltersIcon,
                contentDescription = label,
                tint               = if (active) Color.White else PeakSlate,
                modifier           = Modifier.size(16.dp),
            )
            Text(
                text       = label,
                fontSize   = 14.sp,
                fontWeight = FontWeight.Bold,
                color      = if (active) Color.White else PeakSlate,
            )
        }
        if (showBadge) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .align(Alignment.TopEnd)
                    .clip(CircleShape)
                    .background(PeakBlueActive),
            )
        }
    }
}

// ── Icons (self-contained so the components don't depend on feature packages) ───

private val PeakSearchIcon: ImageVector by lazy {
    ImageVector.Builder("PeakSearch", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(Color(0xFF1E293B)), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            // Circle cx=11 cy=11 r=7 approximated as bezier
            moveTo(11f, 4f)
            curveTo(14.866f, 4f, 18f, 7.134f, 18f, 11f)
            curveTo(18f, 14.866f, 14.866f, 18f, 11f, 18f)
            curveTo(7.134f, 18f, 4f, 14.866f, 4f, 11f)
            curveTo(4f, 7.134f, 7.134f, 4f, 11f, 4f)
            close()
        }
        path(stroke = SolidColor(Color(0xFF1E293B)), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(16f, 16f); lineTo(20f, 20f)
        }
    }.build()
}

private val PeakFiltersIcon: ImageVector by lazy {
    ImageVector.Builder("PeakFilters", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(Color(0xFF1E293B)), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) { moveTo(4f, 6f);  lineTo(20f, 6f)  }
        path(stroke = SolidColor(Color(0xFF1E293B)), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) { moveTo(7f, 12f); lineTo(17f, 12f) }
        path(stroke = SolidColor(Color(0xFF1E293B)), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) { moveTo(10f, 18f); lineTo(14f, 18f) }
    }.build()
}

private val PeakCloseIcon: ImageVector by lazy {
    ImageVector.Builder("PeakClose", 16.dp, 16.dp, 16f, 16f).apply {
        path(stroke = SolidColor(Color(0xFF1E293B)), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) { moveTo(12f, 4f); lineTo(4f, 12f) }
        path(stroke = SolidColor(Color(0xFF1E293B)), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) { moveTo(4f, 4f); lineTo(12f, 12f) }
    }.build()
}

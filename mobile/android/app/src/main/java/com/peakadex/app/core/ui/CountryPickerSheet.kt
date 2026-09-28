package com.peakadex.app.core.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.os.ConfigurationCompat
import com.peakadex.app.R
import com.peakadex.app.core.ui.theme.PeakBlueActive
import com.peakadex.app.core.util.allCountriesSorted
import com.peakadex.app.core.util.countryName
import com.peakadex.app.core.util.suggestedCountries
import java.text.Normalizer
import java.util.Locale

/**
 * Country picker shared by Register and Settings. `onSelect(null)` means
 * "not specified" — a real choice, sent to the server as `country: null`.
 *
 * Sheet rules as in CordadaModalSheet: `skipPartiallyExpanded = true` (a partial
 * anchor settles too low after the IME closes) + nav-bar and IME padding.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CountryPickerSheet(
    selected: String?,
    onSelect: (String?) -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val config = LocalConfiguration.current
    val locale: Locale = ConfigurationCompat.getLocales(config)[0] ?: Locale.getDefault()

    val all       = remember(locale) { allCountriesSorted(locale) }
    val names     = remember(locale) { all.associateWith { countryName(it, locale) } }
    val suggested = remember(locale, selected) { suggestedCountries(locale.language, selected) }

    var query by rememberSaveable { mutableStateOf("") }
    val filtered = remember(query, all) {
        val q = fold(query.trim())
        if (q.isEmpty()) all
        else all.filter { fold(names[it].orEmpty()).contains(q) || it.equals(q, ignoreCase = true) }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState       = sheetState,
        containerColor   = Color.White,
        shape            = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f)
                .navigationBarsPadding()
                .imePadding(),
        ) {
            PeakSearchField(
                value         = query,
                onValueChange = { query = it },
                placeholder   = stringResource(R.string.country_search_hint),
                onClear       = { query = "" },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                modifier      = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
            )

            LazyColumn(Modifier.fillMaxWidth().weight(1f)) {
                if (query.isBlank() && suggested.isNotEmpty()) {
                    items(suggested, key = { "s-$it" }) { code ->
                        CountryRow(names[code] ?: code, code == selected) { onSelect(code) }
                    }
                    item(key = "divider") {
                        HorizontalDivider(
                            color    = Color(0xFFF3F4F6),
                            modifier = Modifier.padding(vertical = 4.dp),
                        )
                    }
                }
                items(filtered, key = { it }) { code ->
                    CountryRow(names[code] ?: code, code == selected) { onSelect(code) }
                }
                item(key = "none") {
                    HorizontalDivider(color = Color(0xFFF3F4F6))
                    CountryRow(
                        label      = stringResource(R.string.country_not_specified),
                        isSelected = selected == null,
                        muted      = true,
                    ) { onSelect(null) }
                    Spacer(Modifier.height(8.dp))
                }
            }
        }
    }
}

@Composable
private fun CountryRow(
    label: String,
    isSelected: Boolean,
    muted: Boolean = false,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text       = label,
            fontSize   = 15.sp,
            color      = when {
                isSelected -> PeakBlueActive
                muted      -> Color(0xFF6B7280)
                else       -> Color(0xFF111827)
            },
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
            modifier   = Modifier.weight(1f),
        )
        if (isSelected) {
            Icon(
                CountryCheckIcon,
                contentDescription = null,
                tint     = PeakBlueActive,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

/** Accent- and case-insensitive key, so "espana" finds "España". */
private fun fold(s: String): String =
    Normalizer.normalize(s, Normalizer.Form.NFD)
        .replace(Regex("\\p{Mn}+"), "")
        .lowercase(Locale.ROOT)

private val CountryCheckIcon: ImageVector by lazy {
    ImageVector.Builder("CountryCheck", 24.dp, 24.dp, 24f, 24f).apply {
        path(
            stroke         = SolidColor(Color.Black),
            strokeLineWidth = 2.5f,
            strokeLineCap  = StrokeCap.Round,
        ) {
            moveTo(5f, 12.5f); lineTo(10f, 17.5f); lineTo(19f, 7f)
        }
    }.build()
}

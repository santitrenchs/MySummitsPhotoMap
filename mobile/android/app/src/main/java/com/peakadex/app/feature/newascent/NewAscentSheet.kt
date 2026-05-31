package com.peakadex.app.feature.newascent

import android.graphics.Bitmap
import android.graphics.Matrix
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil3.compose.AsyncImage
import com.peakadex.app.R
import androidx.compose.ui.res.stringResource
import com.peakadex.app.core.model.Peak
import com.peakadex.app.core.model.Person
import com.peakadex.app.core.ui.theme.PeakBlueActive
import com.peakadex.app.core.ui.theme.PeakGreenCTA
import com.peakadex.app.core.ui.theme.PeakBlueContainer
import com.peakadex.app.core.ui.theme.PeakBorderLight
import com.peakadex.app.core.ui.theme.PeakMuted
import com.peakadex.app.core.ui.theme.PeakNavyDark
import com.peakadex.app.core.ui.theme.PeakOnSurface
import com.peakadex.app.core.ui.theme.PeakSubtle
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

// ── Sheet entry point ──────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewAscentSheet(
    onDismiss: () -> Unit,
    onSuccess: (ascentId: String, taggingWarning: String?) -> Unit = { _, _ -> },
    initialPeakId: String? = null,
    initialPeakName: String? = null,
    vm: NewAscentViewModel = viewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope   = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    // Reset state on each presentation (ViewModel persists across opens)
    LaunchedEffect(Unit) {
        vm.reset()
        if (initialPeakId != null && initialPeakName != null) {
            vm.setInitialPeak(initialPeakId, initialPeakName)
        }
    }

    // Photo picker
    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let { vm.onPhotoPicked(it, context) }
    }

    // System back gesture routes between steps
    BackHandler {
        when (state.step) {
            NewAscentStep.PICK -> scope.launch { sheetState.hide(); onDismiss() }
            NewAscentStep.CROP -> vm.onCropBack()
            NewAscentStep.FORM -> vm.onFormBack()
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState       = sheetState,
        containerColor   = Color.Black,
        shape            = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
        dragHandle       = null,
        modifier         = Modifier.fillMaxHeight(),
    ) {
        when (state.step) {
            NewAscentStep.PICK -> PhotoPickStep(
                error       = state.error,
                onPickPhoto = { photoPicker.launch("image/*") },
                onClose     = { scope.launch { sheetState.hide(); onDismiss() } },
            )
            NewAscentStep.CROP -> {
                val bmp = state.originalBitmap
                if (bmp != null) {
                    PhotoCropStep(
                        bitmap = bmp,
                        onBack = vm::onCropBack,
                        onDone = vm::onCropDone,
                    )
                }
            }
            NewAscentStep.FORM -> AscentFormStep(
                state    = state,
                vm       = vm,
                onBack   = vm::onFormBack,
                onSubmit = { vm.submit { ascentId, warning -> onSuccess(ascentId, warning); onDismiss() } },
                onClose  = { scope.launch { sheetState.hide(); onDismiss() } },
            )
        }
    }
}

// ── Step 1: Photo pick ─────────────────────────────────────────────────────────

@Composable
private fun PhotoPickStep(
    error: String?,
    onPickPhoto: () -> Unit,
    onClose: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .systemBarsPadding(),
    ) {
        // Header
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .padding(horizontal = 4.dp),
            contentAlignment = Alignment.Center,
        ) {
            IconButton(onClick = onClose, modifier = Modifier.align(Alignment.CenterStart)) {
                Icon(CloseIcon, contentDescription = stringResource(R.string.action_close), tint = PeakNavyDark)
            }
            Text(
                stringResource(R.string.new_ascent_title),
                fontWeight = FontWeight.SemiBold,
                fontSize   = 16.sp,
                color      = PeakNavyDark,
            )
        }
        HorizontalDivider(thickness = 1.dp, color = PeakBorderLight)

        // Full-area tap target
        Box(
            modifier = Modifier
                .fillMaxSize()
                .clickable(onClick = onPickPhoto),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                PhotoStackIcon()

                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(stringResource(R.string.new_ascent_add_photo), fontSize = 20.sp, fontWeight = FontWeight.Medium, color = PeakNavyDark)
                    Text(stringResource(R.string.new_ascent_photo_formats), fontSize = 13.sp, color = PeakSubtle)
                }

                if (error != null) {
                    Text(error, fontSize = 13.sp, color = Color(0xFFEF4444))
                }

                Button(
                    onClick          = onPickPhoto,
                    colors           = ButtonDefaults.buttonColors(containerColor = PeakGreenCTA),
                    shape            = RoundedCornerShape(10.dp),
                    contentPadding   = PaddingValues(horizontal = 28.dp, vertical = 12.dp),
                ) {
                    Text(stringResource(R.string.new_ascent_select_photo_btn), fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                }
            }
        }
    }
}

// ── Step 2: Crop ───────────────────────────────────────────────────────────────
// Always 4:5 (mirrors web OUTPUT_W=1080 → 1080×1350px). No ratio toggle.

@Composable
private fun PhotoCropStep(
    bitmap: Bitmap,
    onBack: () -> Unit,
    onDone: (Bitmap) -> Unit,
) {
    // currentBitmap holds the displayed (possibly user-rotated) bitmap
    var currentBitmap by remember { mutableStateOf(bitmap) }
    var scale  by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .systemBarsPadding(),
    ) {
        if (constraints.maxWidth == 0 || constraints.maxHeight == 0) return@BoxWithConstraints

        val density    = LocalDensity.current
        val containerW = constraints.maxWidth.toFloat()
        val containerH = constraints.maxHeight.toFloat()

        // Controls bar height: slider row (48dp) + rotate+next row (56dp) + padding (32dp)
        val controlsHeightPx = with(density) { 136.dp.toPx() }
        val cropAreaH = (containerH - controlsHeightPx).coerceAtLeast(1f)

        // Crop rect — 92% of width, always 4:5 portrait
        val cropW    = containerW * 0.92f
        val cropH    = cropW * 5f / 4f
        val cropLeft = (containerW - cropW) / 2f
        val cropTop  = ((cropAreaH - cropH) / 2f).coerceAtLeast(0f)

        val bW = currentBitmap.width.toFloat()
        val bH = currentBitmap.height.toFloat()
        val minScale = maxOf(cropW / bW, cropH / bH)
        val maxScale = minScale * 4f

        LaunchedEffect(currentBitmap) {
            scale  = minScale
            offset = Offset.Zero
        }

        fun clamp(off: Offset, s: Float): Offset {
            val halfW = bW * s / 2f
            val halfH = bH * s / 2f
            val cx    = containerW / 2f + off.x
            val cy    = cropAreaH  / 2f + off.y
            return Offset(
                cx.coerceIn(cropLeft + cropW - halfW, cropLeft + halfW) - containerW / 2f,
                cy.coerceIn(cropTop  + cropH - halfH, cropTop  + halfH) - cropAreaH  / 2f,
            )
        }

        Column(modifier = Modifier.fillMaxSize()) {

            // ── Crop canvas ──────────────────────────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .pointerInput(currentBitmap) {
                        detectTransformGestures { _, pan, zoom, _ ->
                            val newScale  = (scale * zoom).coerceIn(minScale, maxScale)
                            val newOffset = clamp(offset + pan, newScale)
                            scale  = newScale
                            offset = newOffset
                        }
                    },
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val imgCx = size.width  / 2f + offset.x
                    val imgCy = size.height / 2f + offset.y

                    withTransform({
                        translate(imgCx, imgCy)
                        scale(scale, scale)
                        translate(-bW / 2f, -bH / 2f)
                    }) {
                        drawImage(currentBitmap.asImageBitmap())
                    }

                    // Dark overlay (4 rects around crop)
                    val overlay = Color.Black.copy(alpha = 0.55f)
                    if (cropTop > 0f)
                        drawRect(overlay, Offset.Zero, Size(size.width, cropTop))
                    if (cropTop + cropH < size.height)
                        drawRect(overlay, Offset(0f, cropTop + cropH), Size(size.width, size.height - cropTop - cropH))
                    drawRect(overlay, Offset(0f, cropTop),                Size(cropLeft, cropH))
                    drawRect(overlay, Offset(cropLeft + cropW, cropTop),  Size(size.width - cropLeft - cropW, cropH))

                    // White crop border
                    drawRect(
                        color   = Color.White.copy(alpha = 0.85f),
                        topLeft = Offset(cropLeft, cropTop),
                        size    = Size(cropW, cropH),
                        style   = Stroke(width = 2f),
                    )
                    // Rule-of-thirds grid
                    val gridColor = Color.White.copy(alpha = 0.25f)
                    listOf(1f/3f, 2f/3f).forEach { f ->
                        drawLine(gridColor, Offset(cropLeft + cropW*f, cropTop), Offset(cropLeft + cropW*f, cropTop + cropH), 1f)
                        drawLine(gridColor, Offset(cropLeft, cropTop + cropH*f), Offset(cropLeft + cropW, cropTop + cropH*f), 1f)
                    }
                    // L-corner markers
                    val cLen = 22f; val cSw = 3f
                    fun corner(x: Float, y: Float, dx: Float, dy: Float) {
                        drawLine(Color.White, Offset(x, y), Offset(x + dx*cLen, y), cSw, StrokeCap.Round)
                        drawLine(Color.White, Offset(x, y), Offset(x, y + dy*cLen), cSw, StrokeCap.Round)
                    }
                    corner(cropLeft,         cropTop,          1f,  1f)
                    corner(cropLeft + cropW, cropTop,         -1f,  1f)
                    corner(cropLeft,         cropTop + cropH,  1f, -1f)
                    corner(cropLeft + cropW, cropTop + cropH, -1f, -1f)
                }
            }

            // ── Controls bar ─────────────────────────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF111111))
                    .navigationBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                // Zoom slider (mirrors web range input)
                Row(
                    modifier          = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text("−", color = Color.White.copy(alpha = 0.5f), fontSize = 14.sp)
                    androidx.compose.material3.Slider(
                        value         = ((scale - minScale) / (maxScale - minScale)).coerceIn(0f, 1f),
                        onValueChange = { v ->
                            val newScale = minScale + v * (maxScale - minScale)
                            scale  = newScale
                            offset = clamp(offset, newScale)
                        },
                        modifier = Modifier.weight(1f),
                        colors   = androidx.compose.material3.SliderDefaults.colors(
                            thumbColor       = Color.White,
                            activeTrackColor = Color.White,
                            inactiveTrackColor = Color.White.copy(alpha = 0.25f),
                        ),
                    )
                    Text("+", color = Color.White.copy(alpha = 0.5f), fontSize = 14.sp)
                }

                // Rotate + Next row
                Row(
                    modifier             = Modifier.fillMaxWidth(),
                    verticalAlignment    = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    // Back
                    IconButton(onClick = onBack) {
                        Icon(BackArrowIcon, contentDescription = stringResource(R.string.action_back), tint = Color.White)
                    }

                    // Rotate 90°
                    TextButton(onClick = {
                        val m = Matrix().apply { postRotate(90f) }
                        currentBitmap = Bitmap.createBitmap(
                            currentBitmap, 0, 0,
                            currentBitmap.width, currentBitmap.height,
                            m, true,
                        )
                    }) {
                        Icon(RotateIcon, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                        Text(stringResource(R.string.new_ascent_rotate_btn), color = Color.White, fontSize = 13.sp)
                    }

                    // Next
                    Button(
                        onClick = {
                            val s   = scale; val off = offset
                            val bwF = currentBitmap.width.toFloat()
                            val bhF = currentBitmap.height.toFloat()
                            val imgCx   = containerW / 2f + off.x
                            val imgCy   = cropAreaH  / 2f + off.y
                            val imgLeft = imgCx - bwF * s / 2f
                            val imgTop  = imgCy - bhF * s / 2f

                            val srcX = ((cropLeft - imgLeft) / s).coerceAtLeast(0f).toInt()
                            val srcY = ((cropTop  - imgTop)  / s).coerceAtLeast(0f).toInt()
                            val srcW = (cropW / s).toInt().coerceIn(1, currentBitmap.width  - srcX)
                            val srcH = (cropH / s).toInt().coerceIn(1, currentBitmap.height - srcY)

                            onDone(Bitmap.createBitmap(currentBitmap, srcX, srcY, srcW, srcH))
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = PeakGreenCTA),
                        shape  = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp),
                    ) {
                        Text(stringResource(R.string.new_ascent_next_btn), fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                    }
                }
            }
        }
    }
}

// ── Step 3: Form ───────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun AscentFormStep(
    state: NewAscentUiState,
    vm: NewAscentViewModel,
    onBack: () -> Unit,
    onSubmit: () -> Unit,
    onClose: () -> Unit,
) {
    var showDatePicker by remember { mutableStateOf(false) }
    var showDiscard    by remember { mutableStateOf(false) }

    val formattedDate = remember(state.date) {
        runCatching {
            LocalDate.parse(state.date).format(DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG))
        }.getOrElse { state.date }
    }

    val filteredPersons = remember(state.personQuery, state.allPersons, state.selectedPersons) {
        if (state.personQuery.isBlank()) emptyList()
        else state.allPersons
            .filter { it.name.contains(state.personQuery, ignoreCase = true) }
            .filter { p -> state.selectedPersons.none { it.id == p.id } }
            .take(6)
    }

    // ── Date picker dialog ────────────────────────────────────────────────────
    if (showDatePicker) {
        val initialMillis = runCatching {
            LocalDate.parse(state.date).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
        }.getOrElse { System.currentTimeMillis() }

        val dpState = rememberDatePickerState(
            initialSelectedDateMillis = initialMillis,
            selectableDates = object : SelectableDates {
                override fun isSelectableDate(utcTimeMillis: Long) =
                    utcTimeMillis <= System.currentTimeMillis()
            },
        )
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    dpState.selectedDateMillis?.let { millis ->
                        val d = Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate().toString()
                        vm.onDateChange(d)
                    }
                    showDatePicker = false
                }) { Text(stringResource(R.string.action_ok)) }
            },
            dismissButton = { TextButton(onClick = { showDatePicker = false }) { Text(stringResource(R.string.action_cancel)) } },
        ) { DatePicker(state = dpState) }
    }

    // ── Discard confirm dialog ────────────────────────────────────────────────
    if (showDiscard) {
        AlertDialog(
            onDismissRequest = { showDiscard = false },
            title            = { Text(stringResource(R.string.new_ascent_discard_title)) },
            text             = { Text(stringResource(R.string.new_ascent_discard_message)) },
            confirmButton    = {
                TextButton(onClick = { showDiscard = false; onClose() }) {
                    Text(stringResource(R.string.new_ascent_discard_btn), color = Color(0xFFEF4444))
                }
            },
            dismissButton = { TextButton(onClick = { showDiscard = false }) { Text(stringResource(R.string.action_cancel)) } },
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .systemBarsPadding(),
    ) {
        // ── Header ────────────────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .padding(horizontal = 4.dp),
            contentAlignment = Alignment.Center,
        ) {
            IconButton(
                onClick  = { showDiscard = true },
                modifier = Modifier.align(Alignment.CenterStart),
            ) {
                Icon(BackArrowIcon, contentDescription = stringResource(R.string.action_back), tint = PeakNavyDark)
            }
            Text(
                stringResource(R.string.new_ascent_title),
                fontWeight = FontWeight.SemiBold,
                fontSize   = 16.sp,
                color      = PeakNavyDark,
            )
            if (state.isLoading) {
                CircularProgressIndicator(
                    modifier    = Modifier
                        .size(22.dp)
                        .align(Alignment.CenterEnd)
                        .padding(end = 16.dp),
                    strokeWidth = 2.dp,
                    color       = PeakBlueActive,
                )
            } else {
                TextButton(
                    onClick  = onSubmit,
                    modifier = Modifier.align(Alignment.CenterEnd),
                    enabled  = state.selectedPeak != null && !state.isLoading,
                ) {
                    Text(
                        stringResource(R.string.new_ascent_save_btn),
                        fontWeight = FontWeight.Bold,
                        fontSize   = 15.sp,
                        color      = if (state.selectedPeak != null) PeakBlueActive else PeakSubtle,
                    )
                }
            }
        }
        HorizontalDivider(thickness = 1.dp, color = PeakBorderLight)

        // ── Scrollable form ───────────────────────────────────────────────────
        LazyColumn(
            modifier        = Modifier.fillMaxSize(),
            contentPadding  = PaddingValues(horizontal = 16.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {

            // Photo preview
            state.croppedBitmap?.let { bmp ->
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(4f / 5f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color.Black),
                    ) {
                        Image(
                            bitmap       = bmp.asImageBitmap(),
                            contentDescription = "Foto",
                            contentScale = ContentScale.Crop,
                            modifier     = Modifier.fillMaxSize(),
                        )
                    }
                }
            }

            // Peak picker
            item {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    FormLabel(stringResource(R.string.new_ascent_field_peak))
                    OutlinedTextField(
                        value           = state.peakQuery,
                        onValueChange   = vm::onPeakQueryChange,
                        modifier        = Modifier.fillMaxWidth(),
                        placeholder     = { Text(stringResource(R.string.new_ascent_search_peak_placeholder), color = PeakSubtle) },
                        trailingIcon    = if (state.selectedPeak != null) ({
                            Icon(CheckCircleIcon, null, tint = Color(0xFF22C55E), modifier = Modifier.size(20.dp))
                        }) else null,
                        singleLine      = true,
                        keyboardOptions = KeyboardOptions(
                            capitalization = KeyboardCapitalization.Words,
                            imeAction      = ImeAction.Done,
                        ),
                        shape  = RoundedCornerShape(8.dp),
                        colors = inputColors(),
                    )

                    // Dropdown results
                    if (state.isPeakDropdownOpen && state.peakResults.isNotEmpty()) {
                        Card(
                            modifier  = Modifier.fillMaxWidth(),
                            shape     = RoundedCornerShape(8.dp),
                            elevation = CardDefaults.cardElevation(4.dp),
                            colors    = CardDefaults.cardColors(containerColor = Color.White),
                        ) {
                            Column {
                                state.peakResults.forEachIndexed { idx, peak ->
                                    PeakResultRow(peak = peak, onClick = { vm.onPeakSelected(peak) })
                                    if (idx < state.peakResults.lastIndex)
                                        HorizontalDivider(color = PeakBorderLight)
                                }
                            }
                        }
                    }
                }
            }

            // Date
            item {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    FormLabel(stringResource(R.string.new_ascent_field_date))
                    OutlinedTextField(
                        value         = formattedDate,
                        onValueChange = {},
                        modifier      = Modifier
                            .fillMaxWidth()
                            .clickable { showDatePicker = true },
                        enabled       = false,
                        readOnly      = true,
                        trailingIcon  = { Icon(CalendarIcon, null, tint = PeakMuted, modifier = Modifier.size(18.dp)) },
                        singleLine    = true,
                        shape         = RoundedCornerShape(8.dp),
                        colors        = OutlinedTextFieldDefaults.colors(
                            disabledBorderColor      = PeakBorderLight,
                            disabledTextColor        = PeakNavyDark,
                            disabledTrailingIconColor = PeakMuted,
                        ),
                    )
                }
            }

            // Route (optional)
            item {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    FormLabel(stringResource(R.string.new_ascent_field_route))
                    OutlinedTextField(
                        value           = state.route,
                        onValueChange   = { if (it.length <= 500) vm.onRouteChange(it) },
                        modifier        = Modifier.fillMaxWidth(),
                        placeholder     = { Text(stringResource(R.string.new_ascent_route_placeholder), color = PeakSubtle) },
                        singleLine      = true,
                        keyboardOptions = KeyboardOptions(
                            capitalization = KeyboardCapitalization.Sentences,
                            imeAction      = ImeAction.Next,
                        ),
                        shape  = RoundedCornerShape(8.dp),
                        colors = inputColors(),
                    )
                }
            }

            // Notes (optional)
            item {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    FormLabel(stringResource(R.string.new_ascent_field_notes))
                    OutlinedTextField(
                        value           = state.notes,
                        onValueChange   = { if (it.length <= 2000) vm.onNotesChange(it) },
                        modifier        = Modifier.fillMaxWidth(),
                        placeholder     = { Text(stringResource(R.string.new_ascent_notes_placeholder), color = PeakSubtle) },
                        minLines        = 3,
                        maxLines        = 6,
                        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                        shape           = RoundedCornerShape(8.dp),
                        colors          = inputColors(),
                    )
                }
            }

            // Person tagging (optional)
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    FormLabel(stringResource(R.string.new_ascent_field_tag_persons))

                    // Selected chips
                    if (state.selectedPersons.isNotEmpty()) {
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalArrangement   = Arrangement.spacedBy(6.dp),
                        ) {
                            state.selectedPersons.forEach { person ->
                                PersonChip(person = person, onRemove = { vm.onPersonRemoved(person.id) })
                            }
                        }
                    }

                    // Search input
                    OutlinedTextField(
                        value           = state.personQuery,
                        onValueChange   = vm::onPersonQueryChange,
                        modifier        = Modifier.fillMaxWidth(),
                        placeholder     = { Text(stringResource(R.string.new_ascent_tag_placeholder), color = PeakSubtle) },
                        singleLine      = true,
                        keyboardOptions = KeyboardOptions(
                            capitalization = KeyboardCapitalization.Words,
                            imeAction      = ImeAction.Done,
                        ),
                        shape  = RoundedCornerShape(8.dp),
                        colors = inputColors(),
                    )

                    // Results dropdown
                    if (filteredPersons.isNotEmpty()) {
                        Card(
                            modifier  = Modifier.fillMaxWidth(),
                            shape     = RoundedCornerShape(8.dp),
                            elevation = CardDefaults.cardElevation(2.dp),
                            colors    = CardDefaults.cardColors(containerColor = Color.White),
                        ) {
                            Column {
                                filteredPersons.forEachIndexed { idx, person ->
                                    PersonResultRow(person = person, onClick = { vm.onPersonSelected(person) })
                                    if (idx < filteredPersons.lastIndex)
                                        HorizontalDivider(color = PeakBorderLight)
                                }
                            }
                        }
                    }
                }
            }

            // Error message
            if (state.error != null) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF2F2)),
                        shape  = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, Color(0xFFFECACA)),
                    ) {
                        Text(
                            text     = state.error!!,
                            modifier = Modifier.padding(12.dp),
                            fontSize = 13.sp,
                            color    = Color(0xFFDC2626),
                        )
                    }
                }
            }

            // Keyboard spacer
            item { Spacer(Modifier.navigationBarsPadding()) }
        }
    }
}

// ── Reusable sub-composables ───────────────────────────────────────────────────

@Composable
private fun FormLabel(text: String) {
    Text(text, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = PeakOnSurface)
}

@Composable
private fun inputColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor   = PeakBlueActive,
    unfocusedBorderColor = PeakBorderLight,
)

@Composable
private fun PeakResultRow(peak: Peak, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment     = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(peak.name, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = PeakNavyDark)
            peak.mountainRange?.let { Text(it, fontSize = 12.sp, color = PeakSubtle) }
        }
        Text("${peak.altitudeM} m", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = PeakBlueActive)
    }
}

@Composable
private fun PersonResultRow(person: Person, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(PeakBlueContainer),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                person.name.first().uppercaseChar().toString(),
                fontSize   = 14.sp,
                fontWeight = FontWeight.Bold,
                color      = PeakBlueActive,
            )
        }
        Text(person.name, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = PeakNavyDark)
    }
}

@Composable
private fun PersonChip(person: Person, onRemove: () -> Unit) {
    Row(
        modifier = Modifier
            .background(Color(0xFFEFF6FF), RoundedCornerShape(100.dp))
            .border(1.dp, Color(0xFFBFDBFE), RoundedCornerShape(100.dp))
            .padding(start = 10.dp, end = 4.dp, top = 5.dp, bottom = 5.dp),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(person.name, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF0369A1))
        IconButton(onClick = onRemove, modifier = Modifier.size(20.dp)) {
            Icon(SmallCloseIcon, contentDescription = stringResource(R.string.action_clear), tint = Color(0xFF93C5FD), modifier = Modifier.size(12.dp))
        }
    }
}

// Decorative photo-stack illustration (mirrors the web SVG)
@Composable
private fun PhotoStackIcon() {
    val dark = Color(0xFF111827)
    Canvas(modifier = Modifier.size(80.dp, 72.dp)) {
        val sx = size.width  / 80f
        val sy = size.height / 72f

        withTransform({ scale(sx, sy, Offset.Zero) }) {
            // Back card (rotated -6° around top-left corner)
            withTransform({ rotate(-6f, Offset(22f, 8f)) }) {
                drawRoundRect(dark.copy(alpha = 0.38f), Offset(22f, 8f), Size(46f, 38f), CornerRadius(5f), Stroke(2.2f))
            }
            // Front card (white fill + border)
            drawRoundRect(Color.White, Offset(12f, 20f), Size(46f, 38f), CornerRadius(5f))
            drawRoundRect(dark, Offset(12f, 20f), Size(46f, 38f), CornerRadius(5f), Stroke(2.2f))
            // Mountain silhouette
            val mtn = Path().apply {
                moveTo(20f, 50f); lineTo(30f, 34f); lineTo(37f, 42f); lineTo(43f, 36f); lineTo(57f, 50f); close()
            }
            drawPath(mtn, dark.copy(alpha = 0.45f), style = Stroke(1.8f))
            // Sun circle
            drawCircle(dark.copy(alpha = 0.45f), radius = 4f, center = Offset(50f, 30f), style = Stroke(1.8f))
        }
    }
}

// ── Inline ImageVectors ────────────────────────────────────────────────────────

private val CloseIcon: ImageVector by lazy {
    ImageVector.Builder("Close", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(18f, 6f); lineTo(6f, 18f)
        }
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(6f, 6f); lineTo(18f, 18f)
        }
    }.build()
}

private val BackArrowIcon: ImageVector by lazy {
    ImageVector.Builder("Back", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(15f, 18f); lineTo(9f, 12f); lineTo(15f, 6f)
        }
    }.build()
}

private val RotateIcon: ImageVector by lazy {
    ImageVector.Builder("Rotate", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(1f, 4f); lineTo(1f, 10f); lineTo(7f, 10f)
        }
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(3.51f, 15f)
            curveTo(4.15f, 16.83f, 5.38f, 18.37f, 7f, 19.41f)
            curveTo(8.62f, 20.45f, 10.54f, 20.91f, 12.43f, 20.71f)
            curveTo(14.32f, 20.5f, 16.1f, 19.63f, 17.47f, 18.26f)
            curveTo(18.84f, 16.9f, 19.72f, 15.12f, 19.95f, 13.22f)
            curveTo(20.18f, 11.33f, 19.73f, 9.41f, 18.69f, 7.79f)
            curveTo(17.66f, 6.17f, 16.12f, 4.94f, 14.3f, 4.29f)
            curveTo(12.47f, 3.64f, 10.48f, 3.6f, 8.63f, 4.19f)
            lineTo(1f, 4f)
        }
    }.build()
}

private val CalendarIcon: ImageVector by lazy {
    ImageVector.Builder("Calendar", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(19f, 4f); lineTo(5f, 4f)
            curveTo(3.9f, 4f, 3f, 4.9f, 3f, 6f); lineTo(3f, 20f)
            curveTo(3f, 21.1f, 3.9f, 22f, 5f, 22f); lineTo(19f, 22f)
            curveTo(20.1f, 22f, 21f, 21.1f, 21f, 20f); lineTo(21f, 6f)
            curveTo(21f, 4.9f, 20.1f, 4f, 19f, 4f); close()
        }
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(16f, 2f); lineTo(16f, 6f)
        }
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(8f, 2f); lineTo(8f, 6f)
        }
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(3f, 10f); lineTo(21f, 10f)
        }
    }.build()
}

private val CheckCircleIcon: ImageVector by lazy {
    ImageVector.Builder("CheckCircle", 24.dp, 24.dp, 24f, 24f).apply {
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(22f, 11.08f); lineTo(22f, 12f)
            curveTo(21.99f, 14.15f, 21.31f, 16.24f, 20.06f, 17.97f)
            curveTo(18.82f, 19.71f, 17.06f, 21.0f, 15.02f, 21.68f)
            curveTo(12.98f, 22.36f, 10.77f, 22.4f, 8.7f, 21.77f)
            curveTo(6.63f, 21.13f, 4.83f, 19.84f, 3.56f, 18.11f)
            curveTo(2.3f, 16.38f, 1.62f, 14.3f, 1.62f, 12.15f)
            curveTo(1.62f, 10.0f, 2.3f, 7.92f, 3.56f, 6.19f)
            curveTo(4.83f, 4.45f, 6.63f, 3.16f, 8.7f, 2.53f)
            curveTo(10.77f, 1.9f, 12.98f, 1.93f, 15.02f, 2.62f)
        }
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 2f, strokeLineCap = StrokeCap.Round) {
            moveTo(22f, 4f); lineTo(12f, 14.01f); lineTo(9f, 11.01f)
        }
    }.build()
}

private val SmallCloseIcon: ImageVector by lazy {
    ImageVector.Builder("SmallClose", 12.dp, 12.dp, 12f, 12f).apply {
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 1.5f, strokeLineCap = StrokeCap.Round) {
            moveTo(9f, 3f); lineTo(3f, 9f)
        }
        path(stroke = SolidColor(Color.Black), strokeLineWidth = 1.5f, strokeLineCap = StrokeCap.Round) {
            moveTo(3f, 3f); lineTo(9f, 9f)
        }
    }.build()
}

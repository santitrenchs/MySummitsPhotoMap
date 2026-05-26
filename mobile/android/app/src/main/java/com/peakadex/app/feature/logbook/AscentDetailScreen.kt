package com.peakadex.app.feature.logbook

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil3.compose.AsyncImage
import com.peakadex.app.core.model.Ascent
import com.peakadex.app.core.model.PersonSummary
import com.peakadex.app.core.model.Photo

// ── Entry point ────────────────────────────────────────────────────────────────

@Composable
fun AscentDetailScreen(
    ascentId: String,
    onBack: () -> Unit,
    vm: AscentDetailViewModel = viewModel(factory = AscentDetailViewModel.Factory(ascentId)),
) {
    val state by vm.uiState.collectAsStateWithLifecycle()

    when (val s = state) {
        is AscentDetailUiState.Loading -> DetailLoadingState(onBack = onBack)
        is AscentDetailUiState.Error   -> DetailErrorState(s.message, onBack, onRetry = { vm.load() })
        is AscentDetailUiState.Success -> DetailContent(ascent = s.ascent, onBack = onBack)
    }
}

// ── Full detail view ───────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DetailContent(ascent: Ascent, onBack: () -> Unit) {
    val heroPhoto = ascent.photos.firstOrNull()
    val extraPhotos = ascent.photos.drop(1)

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text     = ascent.peak.name,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        style    = MaterialTheme.typography.titleLarge,
                        color    = MaterialTheme.colorScheme.onSurface,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector        = BackArrowIcon,
                            contentDescription = "Volver",
                            tint               = MaterialTheme.colorScheme.primary,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
            HorizontalDivider(thickness = 1.dp, color = MaterialTheme.colorScheme.outlineVariant)
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { innerPadding ->
        LazyColumn(
            contentPadding = PaddingValues(
                top    = innerPadding.calculateTopPadding(),
                bottom = innerPadding.calculateBottomPadding() + 24.dp,
            ),
        ) {
            // Hero image
            item { HeroImage(photo = heroPhoto, peakName = ascent.peak.name, altitudeM = ascent.peak.altitudeM) }

            // Peak info card
            item {
                PeakInfoCard(ascent = ascent)
            }

            // Tagged persons
            if (ascent.persons.isNotEmpty()) {
                item { PersonsRow(ascent.persons) }
            }

            // Extra photos grid
            if (extraPhotos.isNotEmpty()) {
                item {
                    ExtraPhotosSection(photos = extraPhotos)
                }
            }
        }
    }
}

// ── Hero image ─────────────────────────────────────────────────────────────────

@Composable
private fun HeroImage(photo: Photo?, peakName: String, altitudeM: Int) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(4f / 5f)
            .background(Color(0xFF1C2D3F)),
    ) {
        if (photo != null) {
            AsyncImage(
                model              = photo.url,
                contentDescription = peakName,
                contentScale       = ContentScale.Crop,
                modifier           = Modifier.fillMaxSize(),
            )
        } else {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("🏔️", fontSize = 64.sp)
            }
        }

        // Gradient overlay at bottom
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.35f)
                .align(Alignment.BottomStart)
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Transparent, Color(0xCC000000))
                    )
                ),
        )

        // Altitude badge — bottom right
        Box(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Color(0xCC000000))
                .border(1.dp, Color(0x40FFFFFF), RoundedCornerShape(8.dp))
                .padding(horizontal = 10.dp, vertical = 5.dp),
        ) {
            Text(
                text       = "$altitudeM m",
                fontSize   = 14.sp,
                fontWeight = FontWeight.ExtraBold,
                color      = Color.White,
                letterSpacing = (-0.01).em,
            )
        }
    }
}

// ── Peak info card ─────────────────────────────────────────────────────────────

@Composable
private fun PeakInfoCard(ascent: Ascent) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(14.dp))
            .padding(18.dp),
    ) {
        // Peak name + range/country
        Text(
            text          = ascent.peak.name,
            fontSize      = 22.sp,
            fontWeight    = FontWeight.ExtraBold,
            color         = MaterialTheme.colorScheme.onSurface,
            letterSpacing = (-0.03).em,
            lineHeight    = 26.sp,
        )

        val subtitle = listOfNotNull(ascent.peak.mountainRange, ascent.peak.country)
            .joinToString(" · ")
        if (subtitle.isNotEmpty()) {
            Spacer(Modifier.height(3.dp))
            Text(
                text     = subtitle,
                fontSize = 14.sp,
                color    = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }

        Spacer(Modifier.height(16.dp))
        HorizontalDivider(color = MaterialTheme.colorScheme.surfaceVariant)
        Spacer(Modifier.height(14.dp))

        // Date
        InfoRow(icon = "📅", text = formatDate(ascent.date))

        // Route
        if (!ascent.route.isNullOrBlank()) {
            Spacer(Modifier.height(10.dp))
            InfoRow(icon = "🧭", text = ascent.route)
        }

        // Description
        if (!ascent.description.isNullOrBlank()) {
            Spacer(Modifier.height(10.dp))
            InfoRow(icon = "📝", text = ascent.description)
        }
    }
}

@Composable
private fun InfoRow(icon: String, text: String) {
    Row(verticalAlignment = Alignment.Top) {
        Text(
            text     = icon,
            fontSize = 15.sp,
            modifier = Modifier.padding(top = 1.dp),
        )
        Spacer(Modifier.width(8.dp))
        Text(
            text       = text,
            fontSize   = 14.sp,
            color      = MaterialTheme.colorScheme.onSurface,
            lineHeight = 20.sp,
        )
    }
}

// ── Tagged persons ─────────────────────────────────────────────────────────────

@Composable
private fun PersonsRow(persons: List<PersonSummary>) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(bottom = 8.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(14.dp))
            .padding(horizontal = 18.dp, vertical = 14.dp),
    ) {
        Text(
            text       = "Con",
            fontSize   = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color      = MaterialTheme.colorScheme.onSurfaceVariant,
            letterSpacing = 0.05.em,
        )
        Spacer(Modifier.height(10.dp))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(persons) { person ->
                PersonChip(person = person)
            }
        }
    }
}

@Composable
private fun PersonChip(person: PersonSummary) {
    Row(
        modifier = Modifier
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.primaryContainer)
            .border(1.dp, MaterialTheme.colorScheme.primaryContainer, CircleShape)
            .padding(horizontal = 12.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (person.avatarUrl != null) {
            AsyncImage(
                model              = person.avatarUrl,
                contentDescription = person.name,
                contentScale       = ContentScale.Crop,
                modifier           = Modifier
                    .size(20.dp)
                    .clip(CircleShape),
            )
            Spacer(Modifier.width(6.dp))
        }
        Text(
            text       = person.name,
            fontSize   = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color      = MaterialTheme.colorScheme.primary,
        )
    }
}

// ── Extra photos ───────────────────────────────────────────────────────────────

@Composable
private fun ExtraPhotosSection(photos: List<Photo>) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(bottom = 8.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(14.dp))
            .padding(18.dp),
    ) {
        Text(
            text       = "Más fotos",
            fontSize   = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color      = MaterialTheme.colorScheme.onSurfaceVariant,
            letterSpacing = 0.05.em,
        )
        Spacer(Modifier.height(10.dp))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(photos, key = { it.id }) { photo ->
                AsyncImage(
                    model              = photo.url,
                    contentDescription = null,
                    contentScale       = ContentScale.Crop,
                    modifier           = Modifier
                        .size(100.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                )
            }
        }
    }
}

// ── Loading / Error ────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DetailLoadingState(onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {},
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            BackArrowIcon, "Volver",
                            tint = MaterialTheme.colorScheme.primary,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
            HorizontalDivider(thickness = 1.dp, color = MaterialTheme.colorScheme.outlineVariant)
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Box(
            Modifier.fillMaxSize().padding(padding),
            contentAlignment = Alignment.Center,
        ) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DetailErrorState(message: String, onBack: () -> Unit, onRetry: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {},
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(BackArrowIcon, "Volver", tint = MaterialTheme.colorScheme.primary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
            HorizontalDivider(thickness = 1.dp, color = MaterialTheme.colorScheme.outlineVariant)
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            Modifier.fillMaxSize().padding(padding).padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("⚠️", fontSize = 40.sp)
            Spacer(Modifier.height(12.dp))
            Text(message, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = onRetry,
                colors  = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
            ) { Text("Reintentar") }
        }
    }
}

// ── Icons ──────────────────────────────────────────────────────────────────────

private val BackArrowIcon: ImageVector by lazy {
    ImageVector.Builder("BackArrow", 24.dp, 24.dp, 24f, 24f).apply {
        // Shaft: line from right to left
        path(
            stroke          = SolidColor(Color.Black),
            strokeLineWidth = 2.2f,
            strokeLineCap   = StrokeCap.Round,
        ) { moveTo(20f, 12f); lineTo(4f, 12f) }
        // Arrowhead upper
        path(
            stroke          = SolidColor(Color.Black),
            strokeLineWidth = 2.2f,
            strokeLineCap   = StrokeCap.Round,
            strokeLineJoin  = StrokeJoin.Round,
        ) { moveTo(10f, 6f); lineTo(4f, 12f); lineTo(10f, 18f) }
    }.build()
}

package com.peakadex.app.feature.newascent

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.peakadex.app.AppContainer
import com.peakadex.app.core.model.CreateAscentRequest
import com.peakadex.app.core.model.Peak
import com.peakadex.app.core.model.Person
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import retrofit2.HttpException
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream
import java.time.LocalDate

enum class NewAscentStep { PICK, CROP, FORM }

data class NewAscentUiState(
    val step: NewAscentStep = NewAscentStep.PICK,
    // Photo
    val originalBitmap: Bitmap? = null,   // EXIF-corrected, scaled ≤ 2000px
    val croppedBitmap: Bitmap? = null,    // crop output, ready to upload
    // Form
    val peakQuery: String = "",
    val peakResults: List<Peak> = emptyList(),
    val selectedPeak: Peak? = null,
    val isPeakDropdownOpen: Boolean = false,
    val date: String = LocalDate.now().toString(),  // YYYY-MM-DD
    val route: String = "",
    val notes: String = "",
    val personQuery: String = "",
    val allPersons: List<Person> = emptyList(),
    val selectedPersons: List<Person> = emptyList(),
    // Prefill peak when opening from Atlas "Capturar"
    val initialPeakId: String? = null,
    val initialPeakName: String? = null,
    // Async
    val isLoading: Boolean = false,
    val error: String? = null,
)

class NewAscentViewModel : ViewModel() {

    private val api = AppContainer.apiService

    private val _state = MutableStateFlow(NewAscentUiState())
    val state: StateFlow<NewAscentUiState> = _state.asStateFlow()

    private var peakSearchJob: Job? = null

    // ── Initialisation ─────────────────────────────────────────────────────────

    /** Resets to initial state. Called each time the sheet is presented. */
    fun reset() {
        peakSearchJob?.cancel()
        _state.value = NewAscentUiState()
    }

    /** Called when the sheet is opened from Atlas with a pre-selected peak. */
    fun setInitialPeak(peakId: String, peakName: String) {
        _state.update { it.copy(
            initialPeakId   = peakId,
            initialPeakName = peakName,
            peakQuery       = peakName,
        ) }
    }

    // ── Step 1 — PICK ──────────────────────────────────────────────────────────

    fun onPhotoPicked(uri: Uri, context: Context) {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                // Decode bitmap
                val raw = context.contentResolver.openInputStream(uri)!!
                    .use { BitmapFactory.decodeStream(it) }
                    ?: run {
                        withContext(Dispatchers.Main) { _state.update { it.copy(error = "No se pudo cargar la foto") } }
                        return@launch
                    }

                // Read EXIF rotation using low-level API (android.media.ExifInterface)
                val exifDegrees = runCatching {
                    context.contentResolver.openInputStream(uri)!!.use { stream ->
                        val exif = android.media.ExifInterface(stream)
                        val orientation = exif.getAttributeInt(
                            android.media.ExifInterface.TAG_ORIENTATION,
                            android.media.ExifInterface.ORIENTATION_NORMAL,
                        )
                        when (orientation) {
                            android.media.ExifInterface.ORIENTATION_ROTATE_90  -> 90
                            android.media.ExifInterface.ORIENTATION_ROTATE_180 -> 180
                            android.media.ExifInterface.ORIENTATION_ROTATE_270 -> 270
                            else -> 0
                        }
                    }
                }.getOrElse { 0 }

                // Apply EXIF orientation
                val oriented = if (exifDegrees != 0) {
                    val m = Matrix().apply { postRotate(exifDegrees.toFloat()) }
                    Bitmap.createBitmap(raw, 0, 0, raw.width, raw.height, m, true)
                } else raw

                // Scale down for display/crop (max 2000px on long side)
                val maxPx = 2000
                val display = if (oriented.width > maxPx || oriented.height > maxPx) {
                    val r = minOf(maxPx.toFloat() / oriented.width, maxPx.toFloat() / oriented.height)
                    Bitmap.createScaledBitmap(oriented, (oriented.width * r).toInt(), (oriented.height * r).toInt(), true)
                } else oriented

                withContext(Dispatchers.Main) {
                    _state.update { it.copy(originalBitmap = display, step = NewAscentStep.CROP, error = null) }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    _state.update { it.copy(error = "Error al cargar la foto: ${e.localizedMessage}") }
                }
            }
        }
    }

    // ── Step 2 — CROP ──────────────────────────────────────────────────────────

    fun onCropDone(cropped: Bitmap) {
        _state.update { it.copy(croppedBitmap = cropped, step = NewAscentStep.FORM) }
        // Load persons for tagging (best-effort)
        viewModelScope.launch {
            val persons = runCatching { api.getPersons() }.getOrDefault(emptyList<Person>())
            _state.update { it.copy(allPersons = persons) }
        }
        // Resolve pre-selected peak (from Atlas)
        val s = _state.value
        if (s.initialPeakId != null && s.selectedPeak == null) {
            viewModelScope.launch {
                runCatching {
                    val peak = api.getPeak(s.initialPeakId)
                    _state.update { it.copy(selectedPeak = peak, peakQuery = peak.name, isPeakDropdownOpen = false) }
                }
            }
        }
    }

    fun onCropBack() = _state.update { it.copy(step = NewAscentStep.PICK, originalBitmap = null, error = null) }

    // ── Step 3 — FORM ──────────────────────────────────────────────────────────

    fun onFormBack() = _state.update { it.copy(step = NewAscentStep.CROP, error = null) }

    fun onPeakQueryChange(query: String) {
        _state.update { it.copy(peakQuery = query, selectedPeak = null, isPeakDropdownOpen = query.isNotBlank()) }
        peakSearchJob?.cancel()
        if (query.isBlank()) { _state.update { it.copy(peakResults = emptyList()) }; return }
        peakSearchJob = viewModelScope.launch {
            delay(300)
            val results = runCatching { api.searchPeaks(query) }.getOrNull()?.peaks ?: emptyList()
            _state.update { it.copy(peakResults = results.take(20)) }
        }
    }

    fun onPeakSelected(peak: Peak) = _state.update {
        it.copy(selectedPeak = peak, peakQuery = peak.name, peakResults = emptyList(), isPeakDropdownOpen = false)
    }

    fun onPeakDropdownDismiss() = _state.update { it.copy(isPeakDropdownOpen = false) }

    fun onDateChange(date: String)     = _state.update { it.copy(date = date) }
    fun onRouteChange(route: String)   = _state.update { it.copy(route = route) }
    fun onNotesChange(notes: String)   = _state.update { it.copy(notes = notes) }

    fun onPersonQueryChange(query: String) = _state.update { it.copy(personQuery = query) }

    fun onPersonSelected(person: Person) = _state.update { s ->
        if (s.selectedPersons.any { it.id == person.id }) s.copy(personQuery = "")
        else s.copy(selectedPersons = s.selectedPersons + person, personQuery = "")
    }

    fun onPersonRemoved(personId: String) = _state.update {
        it.copy(selectedPersons = it.selectedPersons.filter { p -> p.id != personId })
    }

    fun clearError() = _state.update { it.copy(error = null) }

    // ── Submit ─────────────────────────────────────────────────────────────────

    fun submit(onSuccess: (ascentId: String, taggingWarning: String?) -> Unit) {
        val s = _state.value
        if (s.selectedPeak == null) { _state.update { it.copy(error = "Selecciona una cima") }; return }
        val bitmap = s.croppedBitmap ?: run { _state.update { it.copy(error = "La foto es obligatoria") }; return }

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                // 1 — Create ascent record
                val ascent = api.createAscent(CreateAscentRequest(
                    peakId      = s.selectedPeak.id,
                    date        = s.date,
                    route       = s.route.ifBlank { null },
                    description = s.notes.ifBlank { null },
                )).ascent

                // 2 — Upload photo
                val jpegBytes = withContext(Dispatchers.IO) { compressBitmap(bitmap) }
                val filePart  = MultipartBody.Part.createFormData(
                    "file", "photo.jpg",
                    jpegBytes.toRequestBody("image/jpeg".toMediaType()),
                )
                val ascentIdBody = ascent.id.toRequestBody("text/plain".toMediaType())
                val photo = api.uploadPhoto(filePart, ascentIdBody).photo

                // 3 — Tag persons (best-effort; collect names blocked by allowOthersToTag)
                val blockedNames = mutableListOf<String>()
                for (person in s.selectedPersons) {
                    val uid = person.userId ?: continue  // skip unlinked persons silently
                    runCatching {
                        api.addPhotoPerson(photo.id, mapOf("userId" to uid))
                    }.onFailure { e ->
                        if (e is HttpException && e.code() == 403) {
                            blockedNames.add(person.name)
                        }
                    }
                }

                val warning = if (blockedNames.isNotEmpty())
                    blockedNames.joinToString(", ") + " no permite que le etiqueten"
                else null

                _state.update { it.copy(isLoading = false) }
                onSuccess(ascent.id, warning)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = "Error al guardar: ${e.localizedMessage}") }
            }
        }
    }

    private fun compressBitmap(bitmap: Bitmap): ByteArray {
        // Mirror web: OUTPUT_W = 1080, scale by width so 4:5 crop → 1080×1350px, JPEG 0.85
        val targetW = 1080
        val scaled = if (bitmap.width > targetW) {
            val r = targetW.toFloat() / bitmap.width
            Bitmap.createScaledBitmap(bitmap, targetW, (bitmap.height * r).toInt(), true)
        } else bitmap
        return ByteArrayOutputStream().also { scaled.compress(Bitmap.CompressFormat.JPEG, 85, it) }.toByteArray()
    }
}

package com.peakadex.app.feature.newascent

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.peakadex.app.AppContainer
import com.peakadex.app.R
import com.peakadex.app.core.analytics.Telemetry
import com.peakadex.app.core.model.Ascent
import com.peakadex.app.core.ui.UiText
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

/**
 * Max length of the ascent message ("cita"). Capped so the 3-line blockquote on the
 * back of the card always renders in full. Shared by the create form and edit prefill.
 */
const val NOTES_MAX_CHARS = 100

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
    // Edit mode — non-null editAscentId means we PATCH an existing ascent instead of creating.
    val editAscentId: String? = null,
    val existingPhotoId: String? = null,
    val existingPhotoUrl: String? = null,
    val originalPersonUserIds: List<String> = emptyList(),
    // Async
    val isLoading: Boolean = false,
    val error: UiText? = null,
) {
    val isEditMode: Boolean get() = editAscentId != null
}

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
            // Select immediately with a minimal Peak so the form is valid (submit only
            // needs peak.id). onCropDone enriches it via getPeak as best-effort — but the
            // save button must never depend on that network call succeeding.
            selectedPeak    = Peak(id = peakId, name = peakName, altitudeM = 0),
        ) }
    }

    /**
     * Opens the sheet in EDIT mode for an existing ascent. Starts directly on the FORM
     * step pre-filled with the ascent's peak, date, route, notes and tagged people.
     * The existing photo is shown via [NewAscentUiState.existingPhotoUrl]; replacing it
     * is optional (sets [NewAscentUiState.croppedBitmap]).
     *
     * Note: each `ascent.persons` entry carries the tagged user's id in `.id` (the API
     * builds persons as `{ id = userId, name = username ?? name }`), so we can use it
     * directly as the userId for tagging.
     */
    fun initForEdit(ascent: Ascent) {
        peakSearchJob?.cancel()
        val persons = ascent.persons.map { Person(id = it.id, name = it.name, userId = it.id) }
        val firstPhoto = ascent.photos.firstOrNull()
        _state.value = NewAscentUiState(
            step                  = NewAscentStep.FORM,
            editAscentId          = ascent.id,
            selectedPeak          = ascent.peak,
            peakQuery             = ascent.peak.name,
            date                  = ascent.date.take(10),
            route                 = ascent.route ?: "",
            notes                 = (ascent.description ?: "").take(NOTES_MAX_CHARS),
            selectedPersons       = persons,
            originalPersonUserIds = persons.map { it.id },
            existingPhotoId       = firstPhoto?.id,
            existingPhotoUrl      = firstPhoto?.url,
        )
        // Load the full person catalogue for the tag picker (best-effort).
        viewModelScope.launch {
            val all = runCatching { api.getPersons() }.getOrDefault(emptyList<Person>())
            _state.update { it.copy(allPersons = all) }
        }
    }

    // ── Step 1 — PICK ──────────────────────────────────────────────────────────

    fun onPhotoPicked(uri: Uri, context: Context) {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                // Decode bitmap
                val raw = context.contentResolver.openInputStream(uri)!!
                    .use { BitmapFactory.decodeStream(it) }
                    ?: run {
                        withContext(Dispatchers.Main) { _state.update { it.copy(error = UiText.StringRes(R.string.error_load_photo)) } }
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
                    _state.update { it.copy(error = UiText.StringRes(R.string.error_load_photo)) }
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
        // Enrich the pre-selected peak (from Atlas) with full data — best-effort.
        // selectedPeak is already set to a minimal Peak in setInitialPeak, so the form
        // is valid even if this network call fails. Only apply if the user hasn't
        // changed the peak in the meantime.
        val s = _state.value
        if (s.initialPeakId != null) {
            viewModelScope.launch {
                runCatching {
                    val peak = api.getPeak(s.initialPeakId).peak
                    _state.update { st ->
                        if (st.selectedPeak?.id == peak.id)
                            st.copy(selectedPeak = peak, peakQuery = peak.name, isPeakDropdownOpen = false)
                        else st
                    }
                }
            }
        }
    }

    fun onCropBack() = _state.update {
        // In edit mode there is no PICK step before the form — return to the form.
        val target = if (it.isEditMode) NewAscentStep.FORM else NewAscentStep.PICK
        it.copy(step = target, originalBitmap = null, error = null)
    }

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

    fun submit(onSuccess: (ascent: Ascent, taggingWarning: String?) -> Unit) {
        val s = _state.value
        if (s.selectedPeak == null) { _state.update { it.copy(error = UiText.StringRes(R.string.error_select_peak)) }; return }
        val bitmap = s.croppedBitmap ?: run { _state.update { it.copy(error = UiText.StringRes(R.string.error_photo_required)) }; return }

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
                Telemetry.logEvent(
                    Telemetry.Event.ASCENT_CREATED,
                    mapOf(
                        "peak_id" to ascent.peak.id,
                        "rarity_id" to ascent.peak.rarityId,
                        "altitude_m" to ascent.peak.altitudeM,
                        "is_mythic" to ascent.peak.isMythic,
                        "has_people_tagged" to s.selectedPersons.isNotEmpty(),
                    ),
                )
                // Attach the just-uploaded photo so the capture-reveal card shows it
                // (createAscent returns the ascent BEFORE the photo upload, so its
                // photos list is empty otherwise).
                onSuccess(ascent.copy(photos = listOf(photo)), warning)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = UiText.StringRes(R.string.error_save)) }
            }
        }
    }

    /**
     * Saves changes to an existing ascent (edit mode). Mirrors the web edit flow:
     *  1. PATCH metadata (peak, date, route, description).
     *  2. If a new photo was cropped → upload it, tag people on it, delete the old photo.
     *  3. If the photo is unchanged → reconcile person tags on the existing photo
     *     (add newly-selected, remove de-selected).
     */
    fun submitEdit(onSuccess: (taggingWarning: String?) -> Unit) {
        val s = _state.value
        val ascentId = s.editAscentId ?: return
        if (s.selectedPeak == null) { _state.update { it.copy(error = UiText.StringRes(R.string.error_select_peak)) }; return }

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                // 1 — Update metadata
                api.updateAscent(
                    ascentId,
                    mapOf(
                        "peakId"      to s.selectedPeak.id,
                        "date"        to s.date,
                        "route"       to s.route.ifBlank { null },
                        "description" to s.notes.ifBlank { null },
                    ),
                )

                val blockedNames = mutableListOf<String>()
                val newBitmap = s.croppedBitmap

                if (newBitmap != null) {
                    // 2 — Replace photo: upload new, tag people, delete the old one
                    val jpegBytes = withContext(Dispatchers.IO) { compressBitmap(newBitmap) }
                    val filePart  = MultipartBody.Part.createFormData(
                        "file", "photo.jpg",
                        jpegBytes.toRequestBody("image/jpeg".toMediaType()),
                    )
                    val photo = api.uploadPhoto(filePart, ascentId.toRequestBody("text/plain".toMediaType())).photo
                    for (person in s.selectedPersons) {
                        val uid = person.userId ?: continue
                        runCatching { api.addPhotoPerson(photo.id, mapOf("userId" to uid)) }
                            .onFailure { e -> if (e is HttpException && e.code() == 403) blockedNames.add(person.name) }
                    }
                    s.existingPhotoId?.let { old -> runCatching { api.deletePhoto(old) } }
                } else if (s.existingPhotoId != null) {
                    // 3 — Photo unchanged: reconcile person tags on the existing photo
                    val photoId      = s.existingPhotoId
                    val selectedUids = s.selectedPersons.mapNotNull { it.userId }
                    val toAdd        = selectedUids - s.originalPersonUserIds.toSet()
                    val toRemove     = s.originalPersonUserIds - selectedUids.toSet()
                    for (uid in toAdd) {
                        runCatching { api.addPhotoPerson(photoId, mapOf("userId" to uid)) }
                            .onFailure { e ->
                                if (e is HttpException && e.code() == 403) {
                                    s.selectedPersons.firstOrNull { it.userId == uid }?.let { blockedNames.add(it.name) }
                                }
                            }
                    }
                    for (uid in toRemove) {
                        runCatching { api.removePhotoPerson(photoId, mapOf("userId" to uid)) }
                    }
                }

                val warning = if (blockedNames.isNotEmpty())
                    blockedNames.joinToString(", ") + " no permite que le etiqueten"
                else null

                _state.update { it.copy(isLoading = false) }
                Telemetry.logEvent(Telemetry.Event.ASCENT_UPDATED, mapOf("ascent_id" to ascentId))
                onSuccess(warning)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = UiText.StringRes(R.string.error_save)) }
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

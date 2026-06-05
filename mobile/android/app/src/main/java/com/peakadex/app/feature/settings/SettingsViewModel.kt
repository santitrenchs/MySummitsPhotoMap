package com.peakadex.app.feature.settings

import android.app.Application
import android.app.LocaleManager
import android.os.Build
import android.os.LocaleList
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.peakadex.app.AppContainer
import com.peakadex.app.R
import com.peakadex.app.core.model.UpdatePasswordRequest
import com.peakadex.app.core.ui.UiText
import com.peakadex.app.core.model.UpdateSettingsRequest
import com.peakadex.app.core.model.User
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

private const val TAG = "SettingsViewModel"

private val USERNAME_RE = Regex("^[a-zA-Z0-9_.]{3,20}$")

data class SettingsUiState(
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val isChangingPassword: Boolean = false,
    val user: User? = null,
    // editable fields (dirty copies)
    val nameInput: String = "",
    val usernameInput: String = "",
    val usernameError: String? = null,
    // toggles
    val appearInSearch: Boolean = true,
    val allowOthersToTag: Boolean = true,
    val emailNotifications: Boolean = true,
    val activityNotifications: Boolean = true,
    // language
    val selectedLanguage: String = "es",
    val isLanguageSheetOpen: Boolean = false,
    val isSavingLanguage: Boolean = false,
    // connected accounts
    val googleLinked: Boolean = false,
    val hasPassword: Boolean = false,
    val isUnlinkingGoogle: Boolean = false,
    val showUnlinkGoogleConfirm: Boolean = false,
    // password change form
    val currentPassword: String = "",
    val newPassword: String = "",
    val confirmPassword: String = "",
    val passwordExpanded: Boolean = false,
    // feedback
    val saveSuccess: Boolean = false,
    val passwordSuccess: Boolean = false,
    val languageSaved: Boolean = false,
    val googleUnlinked: Boolean = false,
    val error: UiText? = null,
    val passwordError: UiText? = null,
)

val SettingsUiState.isProfileDirty: Boolean
    get() = user != null &&
        (nameInput != (user.name) || usernameInput != (user.username ?: ""))

class SettingsViewModel(app: Application) : AndroidViewModel(app) {

    private val _state = MutableStateFlow(SettingsUiState())
    val state: StateFlow<SettingsUiState> = _state.asStateFlow()

    init {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val user = AppContainer.apiService.getSettings().user
                AppContainer.authSession.updateUser(user)
                _state.update { it.copy(
                    isLoading             = false,
                    user                  = user,
                    nameInput             = user.name,
                    usernameInput         = user.username ?: "",
                    appearInSearch        = user.appearInSearch ?: true,
                    allowOthersToTag      = user.allowOthersToTag ?: true,
                    emailNotifications    = user.emailNotifications ?: true,
                    activityNotifications = user.activityNotifications ?: true,
                    selectedLanguage      = user.language ?: "es",
                    hasPassword           = user.hasPassword ?: false,
                    googleLinked          = user.googleLinked ?: false,
                ) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: IOException) {
                Log.e(TAG, "load: network error", e)
                _state.update { it.copy(isLoading = false, error = UiText.StringRes(R.string.error_no_connection)) }
            } catch (e: Exception) {
                Log.e(TAG, "load: error", e)
                _state.update { it.copy(isLoading = false, error = UiText.StringRes(R.string.error_load_config)) }
            }
        }
    }

    fun onNameChange(value: String) = _state.update { it.copy(nameInput = value) }

    fun onUsernameChange(value: String) {
        val error = when {
            value.isNotEmpty() && !USERNAME_RE.matches(value) ->
                "Solo letras, números, puntos y guiones bajos (3–20 caracteres)"
            else -> null
        }
        _state.update { it.copy(usernameInput = value, usernameError = error) }
    }

    fun saveProfile() {
        val s = _state.value
        if (s.nameInput.isBlank()) {
            _state.update { it.copy(error = UiText.StringRes(R.string.error_name_empty)) }
            return
        }
        if (s.usernameError != null) return

        viewModelScope.launch {
            _state.update { it.copy(isSaving = true, error = null, saveSuccess = false) }
            try {
                val updated = AppContainer.apiService.updateSettings(
                    UpdateSettingsRequest(
                        name     = s.nameInput.trim(),
                        username = s.usernameInput.trim().ifEmpty { null },
                    )
                ).user
                AppContainer.authSession.updateUser(updated)
                _state.update { it.copy(
                    isSaving     = false,
                    saveSuccess  = true,
                    user         = updated,
                    nameInput    = updated.name,
                    usernameInput = updated.username ?: "",
                ) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: HttpException) {
                Log.e(TAG, "saveProfile HTTP ${e.code()}")
                _state.update { it.copy(
                    isSaving = false,
                    error = if (e.code() == 409) UiText.StringRes(R.string.error_username_taken) else UiText.StringRes(R.string.error_save),
                ) }
            } catch (e: IOException) {
                _state.update { it.copy(isSaving = false, error = UiText.StringRes(R.string.error_no_connection)) }
            } catch (e: Exception) {
                Log.e(TAG, "saveProfile error", e)
                _state.update { it.copy(isSaving = false, error = UiText.StringRes(R.string.error_save)) }
            }
        }
    }

    fun onAppearInSearchChange(value: Boolean) {
        _state.update { it.copy(appearInSearch = value) }
        saveToggle(appearInSearch = value)
    }

    fun onAllowOthersToTagChange(value: Boolean) {
        _state.update { it.copy(allowOthersToTag = value) }
        saveToggle(allowOthersToTag = value)
    }

    fun onEmailNotificationsChange(value: Boolean) {
        _state.update { it.copy(emailNotifications = value) }
        saveToggle(emailNotifications = value)
    }

    fun onActivityNotificationsChange(value: Boolean) {
        _state.update { it.copy(activityNotifications = value) }
        saveToggle(activityNotifications = value)
    }

    private fun saveToggle(
        appearInSearch: Boolean? = null,
        allowOthersToTag: Boolean? = null,
        emailNotifications: Boolean? = null,
        activityNotifications: Boolean? = null,
    ) {
        viewModelScope.launch {
            try {
                val updated = AppContainer.apiService.updateSettings(
                    UpdateSettingsRequest(
                        appearInSearch        = appearInSearch,
                        allowOthersToTag      = allowOthersToTag,
                        emailNotifications    = emailNotifications,
                        activityNotifications = activityNotifications,
                    )
                ).user
                AppContainer.authSession.updateUser(updated)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "saveToggle error", e)
                // Best-effort — revert the toggle on failure by reloading
                load()
            }
        }
    }

    // ─── Password ────────────────────────────────────────────────────────────────

    fun onPasswordExpandedToggle() =
        _state.update { it.copy(passwordExpanded = !it.passwordExpanded, passwordError = null) }

    fun onCurrentPasswordChange(value: String) = _state.update { it.copy(currentPassword = value) }
    fun onNewPasswordChange(value: String)     = _state.update { it.copy(newPassword = value) }
    fun onConfirmPasswordChange(value: String) = _state.update { it.copy(confirmPassword = value) }

    fun savePassword() {
        val s = _state.value
        when {
            s.currentPassword.isBlank() ->
                { _state.update { it.copy(passwordError = UiText.StringRes(R.string.error_password_current_required)) }; return }
            s.newPassword.length < 8 ->
                { _state.update { it.copy(passwordError = UiText.StringRes(R.string.error_password_too_short)) }; return }
            s.newPassword != s.confirmPassword ->
                { _state.update { it.copy(passwordError = UiText.StringRes(R.string.error_passwords_mismatch)) }; return }
        }
        viewModelScope.launch {
            _state.update { it.copy(isChangingPassword = true, passwordError = null, passwordSuccess = false) }
            try {
                AppContainer.apiService.updatePassword(
                    UpdatePasswordRequest(
                        currentPassword = s.currentPassword,
                        newPassword     = s.newPassword,
                    )
                )
                _state.update { it.copy(
                    isChangingPassword = false,
                    passwordSuccess    = true,
                    passwordExpanded   = false,
                    currentPassword    = "",
                    newPassword        = "",
                    confirmPassword    = "",
                ) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: HttpException) {
                Log.e(TAG, "savePassword HTTP ${e.code()}")
                _state.update { it.copy(
                    isChangingPassword = false,
                    passwordError = if (e.code() == 400) UiText.StringRes(R.string.error_password_current_wrong) else UiText.StringRes(R.string.error_password_change),
                ) }
            } catch (e: IOException) {
                _state.update { it.copy(isChangingPassword = false, passwordError = UiText.StringRes(R.string.error_no_connection)) }
            } catch (e: Exception) {
                Log.e(TAG, "savePassword error", e)
                _state.update { it.copy(isChangingPassword = false, passwordError = UiText.StringRes(R.string.error_password_change)) }
            }
        }
    }

    fun clearSuccessFlags() =
        _state.update { it.copy(saveSuccess = false, passwordSuccess = false) }

    fun clearError() = _state.update { it.copy(error = null) }

    // ─── Language ─────────────────────────────────────────────────────────────

    fun onShowLanguageSheet(show: Boolean) =
        _state.update { it.copy(isLanguageSheetOpen = show) }

    fun saveLanguage(locale: String) {
        _state.update { it.copy(isSavingLanguage = true, isLanguageSheetOpen = false) }
        viewModelScope.launch {
            try {
                AppContainer.apiService.updateSettings(UpdateSettingsRequest(language = locale))
                _state.update { it.copy(
                    isSavingLanguage = false,
                    selectedLanguage = locale,
                    // Only show snackbar on API < 33; on API 33+ the Activity restarts
                    languageSaved = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU,
                ) }
                // Apply locale change — triggers Activity recreation on API 33+
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    val lm = getApplication<Application>().getSystemService(LocaleManager::class.java)
                    lm.applicationLocales = LocaleList.forLanguageTags(locale)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "saveLanguage error", e)
                _state.update { it.copy(isSavingLanguage = false, error = UiText.StringRes(R.string.error_save_language)) }
            }
        }
    }

    fun clearLanguageSaved() = _state.update { it.copy(languageSaved = false) }

    // ─── Google unlink ────────────────────────────────────────────────────────

    fun onShowUnlinkConfirm(show: Boolean) =
        _state.update { it.copy(showUnlinkGoogleConfirm = show) }

    fun unlinkGoogle() {
        viewModelScope.launch {
            _state.update { it.copy(isUnlinkingGoogle = true, showUnlinkGoogleConfirm = false) }
            try {
                AppContainer.apiService.unlinkGoogle()
                _state.update { it.copy(
                    isUnlinkingGoogle = false,
                    googleLinked      = false,
                    googleUnlinked    = true,
                ) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "unlinkGoogle error", e)
                _state.update { it.copy(isUnlinkingGoogle = false, error = UiText.StringRes(R.string.error_unlink_google)) }
            }
        }
    }

    fun clearGoogleUnlinked() = _state.update { it.copy(googleUnlinked = false) }
}

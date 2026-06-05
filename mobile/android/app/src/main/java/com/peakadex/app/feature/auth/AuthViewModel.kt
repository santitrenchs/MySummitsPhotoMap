package com.peakadex.app.feature.auth

import android.content.Context
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.peakadex.app.AppContainer
import com.peakadex.app.BuildConfig
import com.peakadex.app.R
import com.peakadex.app.core.ui.UiText
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.SerializationException
import retrofit2.HttpException
import java.io.IOException

private const val TAG = "AuthViewModel"

sealed class AuthUiState {
    data object Idle    : AuthUiState()
    data object Loading : AuthUiState()
    data object Success : AuthUiState()
    data class  Error(val message: UiText) : AuthUiState()
}

class AuthViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Idle)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    // ─── Login ────────────────────────────────────────────────────────────────

    fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _uiState.value = AuthUiState.Error(UiText.StringRes(R.string.error_fields_required))
            return
        }
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            try {
                val response = AppContainer.apiService.login(
                    mapOf("email" to email.trim(), "password" to password)
                )
                AppContainer.authSession.login(response.token, response.user)
                _uiState.value = AuthUiState.Success
            } catch (e: HttpException) {
                Log.e(TAG, "login HTTP ${e.code()}")
                _uiState.value = AuthUiState.Error(
                    when (e.code()) {
                        401  -> UiText.StringRes(R.string.error_invalid_credentials)
                        429  -> UiText.StringRes(R.string.error_too_many_attempts)
                        else -> UiText.Dynamic("Error ${e.code()}")
                    }
                )
            } catch (e: SerializationException) {
                Log.e(TAG, "login serialization error", e)
                _uiState.value = AuthUiState.Error(UiText.StringRes(R.string.error_server_response))
            } catch (e: IOException) {
                Log.e(TAG, "login network error", e)
                _uiState.value = AuthUiState.Error(UiText.StringRes(R.string.error_no_connection))
            } catch (e: Exception) {
                Log.e(TAG, "login unexpected error: ${e::class.simpleName}", e)
                _uiState.value = AuthUiState.Error(UiText.StringRes(R.string.error_unexpected))
            }
        }
    }

    // ─── Register ─────────────────────────────────────────────────────────────

    fun register(
        name: String,
        email: String,
        password: String,
        confirmPassword: String,
        voucherCode: String,
    ) {
        when {
            name.isBlank() || email.isBlank() || password.isBlank() ->
                { _uiState.value = AuthUiState.Error(UiText.StringRes(R.string.error_fields_required)); return }
            password != confirmPassword ->
                { _uiState.value = AuthUiState.Error(UiText.StringRes(R.string.error_passwords_mismatch)); return }
            password.length < 8 ->
                { _uiState.value = AuthUiState.Error(UiText.StringRes(R.string.error_password_too_short)); return }
        }
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            try {
                val response = AppContainer.apiService.register(
                    mapOf(
                        "name"        to name.trim(),
                        "email"       to email.trim(),
                        "password"    to password,
                        "voucherCode" to voucherCode.trim().ifEmpty { null },
                    )
                )
                AppContainer.authSession.login(response.token, response.user)
                _uiState.value = AuthUiState.Success
            } catch (e: HttpException) {
                _uiState.value = AuthUiState.Error(
                    when (e.code()) {
                        400  -> UiText.StringRes(R.string.error_invite_code_invalid)
                        409  -> UiText.StringRes(R.string.error_email_already_exists)
                        else -> UiText.Dynamic("Error ${e.code()}")
                    }
                )
            } catch (e: IOException) {
                _uiState.value = AuthUiState.Error(UiText.StringRes(R.string.error_no_connection))
            } catch (e: Exception) {
                _uiState.value = AuthUiState.Error(UiText.StringRes(R.string.error_unexpected))
            }
        }
    }

    // ─── Google Sign-In ───────────────────────────────────────────────────────

    fun signInWithGoogle(context: Context) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            try {
                val credentialManager = CredentialManager.create(context)
                val googleIdOption = GetGoogleIdOption.Builder()
                    .setFilterByAuthorizedAccounts(false)
                    .setServerClientId(BuildConfig.GOOGLE_WEB_CLIENT_ID)
                    .setAutoSelectEnabled(false)
                    .build()
                val request = GetCredentialRequest.Builder()
                    .addCredentialOption(googleIdOption)
                    .build()
                val result = credentialManager.getCredential(context, request)
                val credential = GoogleIdTokenCredential.createFrom(result.credential.data)
                val idToken = credential.idToken

                val response = AppContainer.apiService.loginWithGoogle(mapOf("idToken" to idToken))
                AppContainer.authSession.login(response.token, response.user)
                _uiState.value = AuthUiState.Success

            } catch (e: GetCredentialCancellationException) {
                Log.d(TAG, "Google sign-in cancelled by user")
                _uiState.value = AuthUiState.Idle
            } catch (e: NoCredentialException) {
                Log.e(TAG, "Google sign-in: no credentials available", e)
                _uiState.value = AuthUiState.Error(UiText.StringRes(R.string.error_google_no_account))
            } catch (e: GetCredentialException) {
                Log.e(TAG, "Google credential error type=${e.type} class=${e::class.simpleName} msg=${e.message}", e)
                _uiState.value = AuthUiState.Error(UiText.StringRes(R.string.error_google_unexpected))
            } catch (e: HttpException) {
                Log.e(TAG, "Google login HTTP ${e.code()}", e)
                _uiState.value = AuthUiState.Error(UiText.Dynamic("Error Google (${e.code()})"))
            } catch (e: IOException) {
                Log.e(TAG, "Google login network error", e)
                _uiState.value = AuthUiState.Error(UiText.StringRes(R.string.error_no_connection))
            } catch (e: Exception) {
                Log.e(TAG, "Google login unexpected: ${e::class.simpleName}", e)
                _uiState.value = AuthUiState.Error(UiText.StringRes(R.string.error_google_unexpected))
            }
        }
    }

    fun resetState() { _uiState.value = AuthUiState.Idle }
}
